/**
 * AdMob runtime manager — native (iOS/Android) implementation.
 *
 * Metro picks `adManager.web.ts` for web builds (Replit preview / browser),
 * so this file never has to consider the web platform. The functions below
 * are all wrapped in try/catch so a failed ad request can never crash the
 * app — if AdMob is misconfigured or the network drops, the game continues
 * normally without ads.
 *
 * Public API (must match adManager.web.ts):
 *   - initializeAds()
 *   - canShowAds()
 *   - setAdsRemovedStatus(removed)
 *   - incrementMatchCount()
 *   - showInterstitialIfAllowed()
 *   - loadInterstitial()
 */

import {
  activeInterstitialUnitId,
  adsSupported,
  INTERSTITIAL_COOLDOWN_MS,
  INTERSTITIAL_EVERY_N_MATCHES,
} from "@/src/config/admob";
import {
  getAdsRemoved,
  getMatchCount,
  incrementMatchCount as persistIncrementMatchCount,
} from "@/src/storage/storage";

// ---------------------------------------------------------------------------
// Module-local state (process-lifetime — resets on full app launch).
// ---------------------------------------------------------------------------

let initialized = false;
let initPromise: Promise<void> | null = null;
let adsRemovedCached = false;
let lastInterstitialAt = 0;
let interstitialInstance: unknown = null;
let interstitialLoaded = false;
let interstitialLoading = false;

// react-native-google-mobile-ads is loaded lazily so a missing native
// module (e.g. running in Expo Go before a development build is made)
// degrades gracefully instead of crashing at import time.
type AdMobModule = {
  default: { initialize: () => Promise<unknown> };
  InterstitialAd: {
    createForAdRequest: (unitId: string) => {
      load: () => void;
      show: () => Promise<void>;
      addAdEventListener: (
        evt: string,
        cb: (...args: unknown[]) => void,
      ) => () => void;
    };
  };
  AdEventType: {
    LOADED: string;
    ERROR: string;
    CLOSED: string;
  };
};

let admob: AdMobModule | null = null;
function loadModule(): AdMobModule | null {
  if (admob) return admob;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    admob = require("react-native-google-mobile-ads") as AdMobModule;
    return admob;
  } catch (err) {
    if (__DEV__) {
      console.log(
        "[ads] react-native-google-mobile-ads not available — running in Expo Go? Build a development build to test ads.",
        err,
      );
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * One-time SDK initialisation. Safe to call multiple times — subsequent
 * calls return the same promise. Hydrates the cached `adsRemoved` flag
 * so banners/interstitials can take a synchronous "should I show?"
 * decision without re-reading AsyncStorage on every render.
 */
export async function initializeAds(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      adsRemovedCached = await getAdsRemoved();
    } catch {
      adsRemovedCached = false;
    }
    if (!adsSupported()) {
      initialized = true;
      return;
    }
    const m = loadModule();
    if (!m) {
      initialized = true;
      return;
    }
    try {
      await m.default.initialize();
      if (__DEV__) console.log("[ads] AdMob initialized");
      initialized = true;
      // Warm up the first interstitial so it's ready by the time the
      // user finishes their first match.
      loadInterstitial();
    } catch (err) {
      // Never crash on ad init failure — flip initialised so we don't
      // retry in a tight loop, and let the rest of the app run.
      if (__DEV__) console.log("[ads] AdMob init failed", err);
      initialized = true;
    }
  })();

  return initPromise;
}

// ---------------------------------------------------------------------------
// Entitlement gate
// ---------------------------------------------------------------------------

/**
 * Sync getter — call after `initializeAds()` resolves. Banners use this
 * to decide whether to render anything at all.
 */
export function canShowAds(): boolean {
  return !adsRemovedCached && adsSupported();
}

/**
 * Called by the IAP layer when the user buys / restores Remove Ads.
 * Updates the in-memory cache so banners hide on the very next render
 * without a reload, and prevents any future interstitial from showing.
 */
export function setAdsRemovedStatus(removed: boolean): void {
  adsRemovedCached = removed;
  if (removed) {
    if (__DEV__) console.log("[ads] Ads disabled because adsRemoved is true");
    interstitialInstance = null;
    interstitialLoaded = false;
  }
}

// ---------------------------------------------------------------------------
// Interstitials
// ---------------------------------------------------------------------------

/**
 * Pre-load an interstitial so it's ready to show instantly. Called after
 * init and again after every successful show (or failure).
 */
export function loadInterstitial(): void {
  if (!canShowAds() || interstitialLoading || interstitialLoaded) return;
  const m = loadModule();
  if (!m) return;
  const unitId = activeInterstitialUnitId();
  if (!unitId) return;
  try {
    interstitialLoading = true;
    const ad = m.InterstitialAd.createForAdRequest(unitId);
    interstitialInstance = ad;
    const unsubLoaded = ad.addAdEventListener(m.AdEventType.LOADED, () => {
      interstitialLoaded = true;
      interstitialLoading = false;
      if (__DEV__) console.log("[ads] Interstitial loaded");
      unsubLoaded();
    });
    const unsubErr = ad.addAdEventListener(m.AdEventType.ERROR, (err) => {
      interstitialLoading = false;
      interstitialLoaded = false;
      interstitialInstance = null;
      if (__DEV__) console.log("[ads] Interstitial failed", err);
      unsubErr();
    });
    ad.load();
  } catch (err) {
    interstitialLoading = false;
    if (__DEV__) console.log("[ads] Interstitial load threw", err);
  }
}

/**
 * Persist the match counter and return the new total. Call this when a
 * Solo run finishes successfully OR when an Online match resolves
 * (win or loss). Spectator-only screens should NOT call it.
 */
export async function incrementMatchCount(): Promise<number> {
  try {
    return await persistIncrementMatchCount();
  } catch {
    return 0;
  }
}

/**
 * Show the loaded interstitial if (a) ads are enabled, (b) the cadence
 * is right (every Nth match), and (c) the cooldown window has elapsed.
 * Returns true if an ad was actually shown.
 *
 * Caller is responsible for ensuring this is invoked OUTSIDE active
 * gameplay — typically on the result screen after a short delay so the
 * win/loss UI has time to render and the user has tapped Continue.
 */
export async function showInterstitialIfAllowed(): Promise<boolean> {
  if (!canShowAds()) return false;
  const count = await getMatchCount();
  if (count <= 0 || count % INTERSTITIAL_EVERY_N_MATCHES !== 0) return false;
  const now = Date.now();
  if (now - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return false;
  if (!interstitialLoaded || !interstitialInstance) {
    // Not ready yet — kick a new load so the next eligible match has one.
    loadInterstitial();
    return false;
  }
  const m = loadModule();
  if (!m) return false;
  try {
    const ad = interstitialInstance as ReturnType<
      AdMobModule["InterstitialAd"]["createForAdRequest"]
    >;
    const closedPromise = new Promise<void>((resolve) => {
      const unsub = ad.addAdEventListener(m.AdEventType.CLOSED, () => {
        if (__DEV__) console.log("[ads] Interstitial closed");
        unsub();
        resolve();
      });
    });
    await ad.show();
    if (__DEV__) console.log("[ads] Interstitial shown");
    lastInterstitialAt = now;
    interstitialLoaded = false;
    interstitialInstance = null;
    // Pre-load the next one in the background.
    loadInterstitial();
    // Best-effort wait for close — don't block forever though.
    await Promise.race([
      closedPromise,
      new Promise<void>((r) => setTimeout(r, 30_000)),
    ]);
    return true;
  } catch (err) {
    if (__DEV__) console.log("[ads] Interstitial show failed", err);
    interstitialLoaded = false;
    interstitialInstance = null;
    loadInterstitial();
    return false;
  }
}
