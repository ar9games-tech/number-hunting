/**
 * AdMob configuration for Number Hunting.
 *
 * Real iOS IDs are provided. Android IDs default to Google's official
 * test units until the user creates real Android units in AdMob —
 * replace the constants marked `// REPLACE WHEN ANDROID READY` below
 * with the production IDs and ship a new build.
 *
 * In development (__DEV__ === true), every ad request automatically uses
 * Google's test ad units regardless of the constants below, so ad-policy
 * violations during testing are impossible. Production builds use the
 * real IDs.
 */

import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Real production IDs (provided by user).
// ---------------------------------------------------------------------------

export const IOS_ADMOB_APP_ID = "ca-app-pub-4297621843674461~2950412213";
export const IOS_BANNER_ID = "ca-app-pub-4297621843674461/7436452133";
export const IOS_INTERSTITIAL_ID = "ca-app-pub-4297621843674461/3634149948";

// REPLACE WHEN ANDROID READY — currently Google's official sample App ID.
// The plugin (configured in app.json) uses this as the manifest meta-data
// value. App IDs are public and safe to commit.
export const ANDROID_ADMOB_APP_ID = "ca-app-pub-3940256099942544~3347511713";

// REPLACE WHEN ANDROID READY — Google sample banner / interstitial units.
// Until you provision real Android units in AdMob, the Android build will
// serve Google test ads (zero revenue but compliant and crash-free).
export const ANDROID_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
export const ANDROID_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

// ---------------------------------------------------------------------------
// Google's official test unit IDs — used automatically in __DEV__ builds.
// See https://developers.google.com/admob/ios/test-ads
// ---------------------------------------------------------------------------

export const TEST_BANNER_IOS = "ca-app-pub-3940256099942544/2934735716";
export const TEST_BANNER_ANDROID = "ca-app-pub-3940256099942544/6300978111";
export const TEST_INTERSTITIAL_IOS = "ca-app-pub-3940256099942544/4411468910";
export const TEST_INTERSTITIAL_ANDROID =
  "ca-app-pub-3940256099942544/1033173712";

/**
 * If true, dev/Expo Go builds will use Google's TEST unit IDs even if the
 * production IDs above are populated. This is the recommended default to
 * avoid clicking your own production ads (a bannable offence).
 */
export const USE_TEST_ADS_IN_DEV = true;

// ---------------------------------------------------------------------------
// Interstitial pacing
// ---------------------------------------------------------------------------

/**
 * Show an interstitial after every Nth completed match (Solo finish OR
 * Online match end). Counter is persisted; the first eligible interstitial
 * is shown at match #N, not #1, so brand-new users never see an ad before
 * they've experienced the game.
 */
export const INTERSTITIAL_EVERY_N_MATCHES = 3;

/**
 * Minimum gap (ms) between two interstitials, in addition to the count
 * pacing above. Prevents a back-to-back rematch from triggering two ads
 * in quick succession.
 */
export const INTERSTITIAL_COOLDOWN_MS = 90_000;

// ---------------------------------------------------------------------------
// Platform-aware ID resolution
// ---------------------------------------------------------------------------

/** Returns the active banner unit ID for the current platform & build mode. */
export function activeBannerUnitId(): string {
  const useTest = __DEV__ && USE_TEST_ADS_IN_DEV;
  if (Platform.OS === "ios") return useTest ? TEST_BANNER_IOS : IOS_BANNER_ID;
  if (Platform.OS === "android")
    return useTest ? TEST_BANNER_ANDROID : ANDROID_BANNER_ID;
  return "";
}

/** Returns the active interstitial unit ID for the current platform & build mode. */
export function activeInterstitialUnitId(): string {
  const useTest = __DEV__ && USE_TEST_ADS_IN_DEV;
  if (Platform.OS === "ios")
    return useTest ? TEST_INTERSTITIAL_IOS : IOS_INTERSTITIAL_ID;
  if (Platform.OS === "android")
    return useTest ? TEST_INTERSTITIAL_ANDROID : ANDROID_INTERSTITIAL_ID;
  return "";
}

/** True on platforms where AdMob native code is available. */
export function adsSupported(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}
