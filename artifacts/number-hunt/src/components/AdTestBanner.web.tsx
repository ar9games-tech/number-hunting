/**
 * Web stub for AdTestBanner — AdMob has no web SDK in this app, so we
 * report a friendly "failed" status and render nothing. This file is
 * picked up by Metro's web bundler via the `.web.tsx` platform
 * extension so the native module is never imported on web.
 */
import { useEffect } from "react";

type Props = {
  onLoaded: () => void;
  onFailed: (err: unknown) => void;
};

export default function AdTestBanner({ onFailed }: Props) {
  useEffect(() => {
    onFailed(new Error("Ads are not available on web. Use a mobile device."));
  }, [onFailed]);
  return null;
}
