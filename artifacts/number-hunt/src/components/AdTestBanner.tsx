/**
 * Live AdMob banner used by the Ad Test screen.
 *
 * Split from `app/ad-test.tsx` so that the native module
 * `react-native-google-mobile-ads` is only ever resolved via Metro's
 * native bundler. The `.web.tsx` sibling renders a friendly stub so
 * the web preview never tries to import native-only code.
 */
import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { activeBannerUnitId } from "@/src/config/admob";

type Props = {
  onLoaded: () => void;
  onFailed: (err: unknown) => void;
};

type BannerModule = {
  BannerAd: React.ComponentType<{
    unitId: string;
    size: string;
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (err: unknown) => void;
  }>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
};

export default function AdTestBanner({ onLoaded, onFailed }: Props) {
  const [mod, setMod] = useState<BannerModule | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = require("react-native-google-mobile-ads") as BannerModule;
      setMod(m);
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      setErr(msg);
      onFailed(e);
    }
  }, [onFailed]);

  if (err || !mod) return null;

  const { BannerAd, BannerAdSize } = mod;
  const unitId = activeBannerUnitId();
  if (!unitId) return null;

  return (
    <View style={{ alignItems: "center", justifyContent: "center", minHeight: 60 }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={onLoaded}
        onAdFailedToLoad={onFailed}
      />
    </View>
  );
}
