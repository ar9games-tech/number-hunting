/**
 * In-App Purchases — "Remove Ads Forever" (non-consumable, $1.99).
 *
 * ============================================================================
 * IMPORTANT — This is a SAFE PLACEHOLDER IMPLEMENTATION for development and
 * Replit testing. It does NOT charge real money. It simulates a successful
 * purchase via a confirmation dialog and persists the result to AsyncStorage
 * so the rest of the app (ads gate, Settings, Profile) behaves exactly as it
 * would in production.
 *
 * To ship REAL purchases you must:
 *
 *   1. Create the product in BOTH stores using the exact product ID below:
 *        - App Store Connect → My Apps → (your app) → In-App Purchases
 *            • Type: Non-Consumable
 *            • Reference Name: Remove Ads Forever
 *            • Product ID: remove_ads_forever
 *            • Price tier: Tier 2 ($1.99)
 *            • Submit for review with localized title + description + screenshot
 *        - Google Play Console → Monetize → Products → In-app products
 *            • Product ID: remove_ads_forever
 *            • Type: Managed product (non-consumable)
 *            • Price: $1.99 (auto-converted per country)
 *            • Status: Active
 *
 *   2. Install a real IAP library (Expo apps can use either):
 *        - expo-in-app-purchases  (recommended for Expo managed workflow)
 *        - react-native-iap       (more features, bare/EAS build)
 *
 *   3. Replace the body of `purchaseRemoveAds()` below with a call into
 *      the chosen SDK. Keep `setAdsRemoved(true)` as the success side-
 *      effect — every other surface in the app keys off AsyncStorage
 *      and will continue to work unchanged.
 *
 *   4. Add `NSUserTrackingUsageDescription` (iOS) only if you also ship the
 *      ad SDK that tracks. The IAP flow itself needs no extra permissions.
 *
 *   5. Test on a real device with a Sandbox tester (iOS) / License tester
 *      (Android). The simulator and Expo Go do NOT support real IAP.
 * ============================================================================
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-native";

import {
  getAdsRemoved,
  setAdsRemoved as persistAdsRemoved,
} from "@/src/storage/storage";

/** Store product identifier — must match App Store Connect / Play Console. */
export const REMOVE_ADS_PRODUCT_ID = "remove_ads_forever";

/**
 * User-facing price. In production this should come from the store SDK's
 * `getProducts([REMOVE_ADS_PRODUCT_ID])` so the currency auto-localizes.
 * For the placeholder we hard-code the spec value.
 */
export const REMOVE_ADS_PRICE_DISPLAY = "$1.99";

// ---------------------------------------------------------------------------
// React context — single source of truth for adsRemoved across the app.
// ---------------------------------------------------------------------------

type AdsRemovedCtx = {
  /** True once the user has bought the Remove Ads entitlement. */
  adsRemoved: boolean;
  /** True while we're hydrating the flag from AsyncStorage on first mount. */
  loading: boolean;
  /** True while a purchase round-trip is in flight. */
  busy: boolean;
  /** Launch the purchase flow. Resolves true on success. */
  purchase: () => Promise<boolean>;
};

const Ctx = createContext<AdsRemovedCtx | null>(null);

export function AdsRemovedProvider({ children }: { children: React.ReactNode }) {
  const [adsRemoved, setAdsRemovedState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Hydrate the purchase entitlement once on mount. This is intentionally
  // stored OUTSIDE the user-facing Settings object so `Reset All Settings`
  // can never wipe a legitimate purchase (Apple/Google would not be amused).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await getAdsRemoved();
      if (!cancelled) {
        setAdsRemovedState(v);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const purchase = useCallback(async () => {
    if (adsRemoved) return true;
    setBusy(true);
    try {
      // -------------------------------------------------------------------
      // PLACEHOLDER PURCHASE FLOW.
      // Replace this Alert with the real store call, e.g. (react-native-iap):
      //
      //   import { requestPurchase, finishTransaction } from "react-native-iap";
      //   const result = await requestPurchase({ sku: REMOVE_ADS_PRODUCT_ID });
      //   await finishTransaction({ purchase: result, isConsumable: false });
      //
      // Or with expo-in-app-purchases:
      //
      //   import * as InAppPurchases from "expo-in-app-purchases";
      //   await InAppPurchases.purchaseItemAsync(REMOVE_ADS_PRODUCT_ID);
      //   // handle setPurchaseListener -> finishTransactionAsync(purchase, false);
      //
      // On success, call `await persistAdsRemoved(true)` and update state —
      // the snippet below already does that for the simulated flow.
      // -------------------------------------------------------------------
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Remove Ads Forever",
          `Confirm a one-time purchase of ${REMOVE_ADS_PRICE_DISPLAY}.\n\n(Development build — no real charge will occur.)`,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Buy", style: "default", onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        );
      });
      if (!confirmed) return false;
      // Persist FIRST and only flip in-memory state when the write is
      // durable — otherwise a transient AsyncStorage failure would leave
      // the user looking at "✓ Ads removed" this session but losing the
      // entitlement on next launch (which Apple/Google rightly consider
      // a refund-class bug for non-consumables).
      const ok = await persistAdsRemoved(true);
      if (!ok) {
        Alert.alert(
          "Purchase failed",
          "We couldn't save your purchase locally. Please try again — you have not been charged.",
        );
        return false;
      }
      setAdsRemovedState(true);
      return true;
    } catch (err) {
      // In production: differentiate user-cancel from real errors and only
      // surface an alert for the latter. The SDKs throw a recognisable
      // `E_USER_CANCELLED` code you can suppress.
      Alert.alert("Purchase failed", String((err as Error)?.message ?? err));
      return false;
    } finally {
      setBusy(false);
    }
  }, [adsRemoved]);

  const value = useMemo<AdsRemovedCtx>(
    () => ({ adsRemoved, loading, busy, purchase }),
    [adsRemoved, loading, busy, purchase],
  );

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useAdsRemoved(): AdsRemovedCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdsRemoved must be used within AdsRemovedProvider");
  return ctx;
}

