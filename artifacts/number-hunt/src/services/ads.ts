/**
 * Ad gate — central place every part of the app should ask before showing
 * any ad (banner, interstitial, or rewarded).
 *
 * Today the app ships NO ad SDK; this file exists so the IAP entitlement is
 * already wired into a single decision point. When ads are added later, swap
 * the placeholder bodies of `<BannerAd />`, `showInterstitial()`, and
 * `showRewarded()` for real SDK calls (e.g. react-native-google-mobile-ads
 * or expo-ads-admob) and ALL the gating below — purchase state, active
 * gameplay, etc. — keeps working unchanged.
 *
 * Gating rules (per product spec):
 *   • If the user has purchased Remove Ads → NEVER show anything.
 *   • While the player is in an active match → NEVER show anything.
 *     (Use `setGameplayActive(true)` on round start, `false` on round end.)
 *   • Otherwise the placeholder no-ops; the real SDK call goes here later.
 *
 * Real SDK setup notes:
 *   • iOS — add SKAdNetworkIdentifiers + NSUserTrackingUsageDescription to
 *     Info.plist; request ATT before initialising AdMob.
 *   • Android — add the AdMob App ID to AndroidManifest.xml meta-data.
 *   • Both — create real ad unit IDs in the AdMob console (test IDs only
 *     during development), and gate the SDK init on `!adsRemoved`.
 */

import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { useAdsRemoved } from "@/src/services/iap";

// ---------------------------------------------------------------------------
// Gameplay-active flag — subscribable so React surfaces can re-render
// immediately when a round starts or ends. Non-React callers (e.g. ad SDK
// callbacks, imperative interstitial triggers) read it via the
// `isGameplayActive()` getter; React components consume `useIsGameplayActive`.
//
// Screens that run gameplay call `setGameplayActive(true)` on mount /
// round-start and `setGameplayActive(false)` on unmount / round-end.
// ---------------------------------------------------------------------------

let gameplayActive = false;
const gameplayListeners = new Set<(v: boolean) => void>();

export function setGameplayActive(active: boolean): void {
  if (gameplayActive === active) return;
  gameplayActive = active;
  // Notify every subscriber synchronously so any mounted <BannerAd /> or
  // gated screen re-evaluates BEFORE the next paint, avoiding a one-frame
  // flash of a banner at the moment gameplay starts.
  gameplayListeners.forEach((l) => l(active));
}

export function isGameplayActive(): boolean {
  return gameplayActive;
}

function useIsGameplayActive(): boolean {
  const [v, setV] = useState(gameplayActive);
  useEffect(() => {
    // Re-sync once on mount in case the flag changed between render and
    // effect attach, then subscribe for the lifetime of the component.
    setV(gameplayActive);
    const fn = (next: boolean) => setV(next);
    gameplayListeners.add(fn);
    return () => {
      gameplayListeners.delete(fn);
    };
  }, []);
  return v;
}

// ---------------------------------------------------------------------------
// React hook — the canonical "should I show ads right now?" answer for UI.
// ---------------------------------------------------------------------------

export function useShowAds(): boolean {
  const { adsRemoved, loading } = useAdsRemoved();
  const playing = useIsGameplayActive();
  if (loading) return false;    // never show while we don't know yet
  if (adsRemoved) return false; // paid to remove
  if (playing) return false;    // spec: no ads during active gameplay
  return true;
}

// ---------------------------------------------------------------------------
// <BannerAd /> — drop-in placeholder. Renders nothing today; when AdMob is
// wired in, replace the inner View with the real <BannerAd /> from the SDK.
// Callers can sprinkle it across menus / results screens without caring
// about the purchase state — the component self-suppresses.
// ---------------------------------------------------------------------------

export function BannerAd({ style }: { style?: object }): React.ReactElement | null {
  const show = useShowAds();
  if (!show) return null;
  // Placeholder slot — invisible, so the layout doesn't reserve space until
  // a real banner SDK is integrated. Swap with the SDK's <BannerAd /> here.
  return React.createElement(View, { style, accessible: false });
}

// ---------------------------------------------------------------------------
// Imperative ad helpers — call from event handlers (e.g. after a solo win,
// before opening the main menu). They are safe no-ops when the user has
// purchased Remove Ads OR is currently in an active match.
// ---------------------------------------------------------------------------

/**
 * Returns a hook function the caller can invoke to request an interstitial.
 * Hook form (instead of a bare function) so we can read `adsRemoved` from
 * context without exporting a duplicate store.
 */
export function useMaybeShowInterstitial(): () => Promise<void> {
  const { adsRemoved } = useAdsRemoved();
  return async () => {
    if (adsRemoved) return;
    if (isGameplayActive()) return;
    // TODO: real SDK call, e.g.
    //   await InterstitialAd.createForAdRequest(AD_UNIT_ID).show();
  };
}

/**
 * Same shape as the interstitial helper, but for rewarded ads. Resolves with
 * `true` if the user completed the ad (and is therefore entitled to the
 * reward). Placeholder always resolves false — i.e. no reward granted.
 */
export function useMaybeShowRewarded(): () => Promise<boolean> {
  const { adsRemoved } = useAdsRemoved();
  return async () => {
    if (adsRemoved) return false;
    if (isGameplayActive()) return false;
    // TODO: real SDK call, e.g.
    //   const earned = await RewardedAd.createForAdRequest(AD_UNIT_ID).show();
    //   return earned;
    return false;
  };
}
