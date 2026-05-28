/**
 * Web no-op stub for the ad manager.
 *
 * Metro automatically picks this file over `adManager.ts` when bundling
 * for `Platform.OS === "web"` (Replit preview, react-native-web). We do
 * NOT want to load react-native-google-mobile-ads on web — it has no
 * web implementation and would break the bundle. Every export below is
 * a safe no-op with the same signature as the native implementation.
 */

export async function initializeAds(): Promise<void> {
  // intentionally empty
}

export function canShowAds(): boolean {
  return false;
}

export function loadInterstitial(): void {
  // intentionally empty
}

export async function incrementMatchCount(): Promise<number> {
  return 0;
}

export async function showInterstitialIfAllowed(): Promise<boolean> {
  return false;
}

export function showInterstitialForTest(callbacks: {
  onLoaded?: () => void;
  onError?: (msg: string) => void;
  onClosed?: () => void;
}): () => void {
  callbacks.onError?.("Ads are not available on web. Use a mobile device.");
  return () => {};
}
