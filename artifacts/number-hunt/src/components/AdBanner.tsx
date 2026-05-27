/**
 * AdBanner — native (iOS/Android) implementation.
 *
 * Renders an AdMob banner safely:
 *   • Renders nothing if `adsRemoved` is true or AdMob isn't ready yet.
 *   • Renders nothing on Expo Go (the native module is missing) so the
 *     game still works for visual testing before a development build.
 *   • Respects bottom safe-area inset so the banner never sits under the
 *     home indicator.
 *   • A failed ad load hides the banner — never reserves empty space.
 *
 * Metro picks `AdBanner.web.tsx` for web bundles, so this file never has
 * to special-case the web platform.
 */

import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { activeBannerUnitId } from "@/src/config/admob";
import { useAdsRemoved } from "@/src/services/iap";

type BannerProps = {
  /** Bottom padding (e.g. safe-area inset). Defaults to 0. */
  bottomInset?: number;
};

// Lazy-loaded native module — keeps the import out of the web bundle and
// allows graceful degradation in Expo Go.
type BannerModule = {
  BannerAd: React.ComponentType<{
    unitId: string;
    size: string;
    requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (err: unknown) => void;
  }>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string; BANNER: string };
};

let cached: BannerModule | null = null;
function loadModule(): BannerModule | null {
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-google-mobile-ads") as BannerModule;
    cached = mod;
    return mod;
  } catch {
    return null;
  }
}

export function AdBanner({ bottomInset = 0 }: BannerProps) {
  const { adsRemoved, loading } = useAdsRemoved();
  const [failed, setFailed] = useState(false);

  // Re-evaluate whether to render once IAP hydration finishes.
  useEffect(() => {
    setFailed(false);
  }, [adsRemoved]);

  if (loading || adsRemoved) return null;
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  const mod = loadModule();
  if (!mod) return null;
  if (failed) return null;
  const unitId = activeBannerUnitId();
  if (!unitId) return null;

  const Banner = mod.BannerAd;
  return (
    <View
      style={[styles.wrap, { paddingBottom: bottomInset }]}
      pointerEvents="box-none"
    >
      <Banner
        unitId={unitId}
        size={mod.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => {
          if (__DEV__) console.log("[ads] Banner loaded");
        }}
        onAdFailedToLoad={(err) => {
          if (__DEV__) console.log("[ads] Banner failed", err);
          setFailed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
