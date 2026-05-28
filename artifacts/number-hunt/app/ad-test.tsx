/**
 * Ad Test Screen — TEMPORARY developer surface.
 *
 * Use this screen on a development build / TestFlight build to verify
 * that AdMob is wired correctly end-to-end before shipping. It renders
 * a live banner, a button that loads + shows an interstitial on demand,
 * and a debug panel showing which mode (DEV vs PRODUCTION) and which
 * unit IDs are currently active.
 *
 * IMPORTANT — REMOVE BEFORE FINAL RELEASE:
 *   1. Delete this file (`app/ad-test.tsx`).
 *   2. Remove the `<Stack.Screen name="ad-test" />` entry in
 *      `app/_layout.tsx`.
 *   3. Remove the "Ad Test (developer)" row from `app/settings.tsx`.
 *   4. Optionally remove the `showInterstitialForTest` helper from
 *      `src/services/adManager.ts` (it's only called from here).
 *
 * Test ad policy:
 *   • In __DEV__ builds (including dev clients and Replit preview), the
 *     ad manager automatically substitutes Google's official TEST unit
 *     IDs so we never serve real ads while testing.
 *   • In production / TestFlight builds, the real iOS unit IDs from
 *     `src/config/admob.ts` are used.
 *   • Tapping or generating fake impressions on real ads is a bannable
 *     AdMob offence — this screen MUST only be reachable in builds you
 *     control, never in a public production build.
 */

import { Feather } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import AdTestBanner from "@/src/components/AdTestBanner";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import {
  activeBannerUnitId,
  activeInterstitialUnitId,
  USE_TEST_ADS_IN_DEV,
} from "@/src/config/admob";
import { useT } from "@/src/i18n/useT";
import { showInterstitialForTest } from "@/src/services/adManager";
import { webBottomInset } from "@/src/theme/theme";

type BannerStatus = "idle" | "loading" | "loaded" | "failed";
type IntStatus = "idle" | "loading" | "loaded" | "failed" | "closed";

export default function AdTestScreen() {
  // HARD PRODUCTION GUARD. Expo Router discovers screens from the file
  // system, so even though `_layout.tsx` only registers this screen
  // when `__DEV__`, the route file itself is still part of the bundle
  // and could in theory be reached. In a release build we immediately
  // redirect to the home screen so end-users / App Reviewers can never
  // see the developer ad test UI. The body below this guard is dead
  // code in production and gets stripped by Metro's release minifier
  // along with the `__DEV__` branches it depends on.
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useT();
  const writingDirection = isRTL ? "rtl" : "ltr";
  const bottomPad =
    (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerStatus, setBannerStatus] = useState<BannerStatus>("idle");
  const [intStatus, setIntStatus] = useState<IntStatus>("idle");
  const [intError, setIntError] = useState<string | null>(null);

  // Cancel any in-flight interstitial test if the user navigates away,
  // so callbacks never fire after unmount (would set state on a
  // detached component otherwise).
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      cancelRef.current?.();
    },
    [],
  );

  const bannerUnit = activeBannerUnitId() || "(none)";
  const intUnit = activeInterstitialUnitId() || "(none)";
  const useTestAds = __DEV__ && USE_TEST_ADS_IN_DEV;
  const modeLabel = useTestAds ? t("adTest.modeDev") : t("adTest.modeProd");

  const handleShowBanner = () => {
    setBannerStatus("loading");
    setBannerVisible(true);
  };

  const handleShowInterstitial = () => {
    setIntError(null);
    setIntStatus("loading");
    cancelRef.current?.();
    cancelRef.current = showInterstitialForTest({
      onLoaded: () => {
        setIntStatus("loaded");
        if (__DEV__) console.log("[ad-test] Interstitial loaded");
      },
      onError: (msg) => {
        setIntStatus("failed");
        setIntError(msg);
        if (__DEV__) console.log("[ad-test] Interstitial failed:", msg);
      },
      onClosed: () => {
        setIntStatus("closed");
        if (__DEV__) console.log("[ad-test] Interstitial closed");
      },
    });
  };

  const bannerStatusLabel =
    bannerStatus === "loading"
      ? t("adTest.statusLoading")
      : bannerStatus === "loaded"
        ? t("adTest.statusBannerLoaded")
        : bannerStatus === "failed"
          ? t("adTest.statusBannerFailed")
          : t("adTest.statusIdle");

  const intStatusLabel =
    intStatus === "loading"
      ? t("adTest.statusLoading")
      : intStatus === "loaded"
        ? t("adTest.statusIntLoaded")
        : intStatus === "failed"
          ? t("adTest.statusIntFailed")
          : intStatus === "closed"
            ? t("adTest.statusIntClosed")
            : t("adTest.statusIdle");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("adTest.title")} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner section -------------------------------------------------- */}
        <Section title={t("adTest.bannerSection")} colors={colors} wd={writingDirection}>
          <Button title={t("adTest.showBannerCta")} fullWidth onPress={handleShowBanner} />
          <StatusPill
            label={bannerStatusLabel}
            status={bannerStatus}
            colors={colors}
            wd={writingDirection}
          />
          {bannerVisible ? (
            <View style={styles.bannerWrap}>
              <AdTestBanner
                onLoaded={() => setBannerStatus("loaded")}
                onFailed={(err) => {
                  if (__DEV__) console.log("[ad-test] Banner failed", err);
                  setBannerStatus("failed");
                }}
              />
              {bannerStatus === "failed" ? (
                <Text
                  style={[
                    styles.muted,
                    { color: colors.mutedForeground, writingDirection },
                  ]}
                >
                  {t("adTest.noAd")}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Section>

        {/* Interstitial section ------------------------------------------- */}
        <Section title={t("adTest.interstitialSection")} colors={colors} wd={writingDirection}>
          <Button
            title={t("adTest.showInterstitialCta")}
            fullWidth
            onPress={handleShowInterstitial}
          />
          <StatusPill
            label={intStatusLabel}
            status={intStatus}
            colors={colors}
            wd={writingDirection}
          />
          {intError ? (
            <Text style={[styles.muted, { color: colors.destructive, writingDirection }]}>
              {intError}
            </Text>
          ) : null}
        </Section>

        {/* Debug info ----------------------------------------------------- */}
        <Section title={t("adTest.debugSection")} colors={colors} wd={writingDirection}>
          <DebugRow
            label={t("adTest.currentMode")}
            value={modeLabel}
            colors={colors}
            wd={writingDirection}
          />
          <DebugRow
            label={t("adTest.bannerUnit")}
            value={bannerUnit}
            colors={colors}
            wd={writingDirection}
            mono
          />
          <DebugRow
            label={t("adTest.interstitialUnit")}
            value={intUnit}
            colors={colors}
            wd={writingDirection}
            mono
          />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
  wd,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  wd: "ltr" | "rtl";
}) {
  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.mutedForeground, writingDirection: wd },
        ]}
      >
        {title.toUpperCase()}
      </Text>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function StatusPill({
  label,
  status,
  colors,
  wd,
}: {
  label: string;
  status: BannerStatus | IntStatus;
  colors: ReturnType<typeof useColors>;
  wd: "ltr" | "rtl";
}) {
  const tone =
    status === "loaded" || status === "closed"
      ? colors.success
      : status === "failed"
        ? colors.destructive
        : status === "loading"
          ? colors.accent
          : colors.mutedForeground;
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: tone + "22", borderColor: tone + "55" },
      ]}
    >
      <Feather
        name={
          status === "loaded" || status === "closed"
            ? "check-circle"
            : status === "failed"
              ? "alert-circle"
              : "activity"
        }
        size={14}
        color={tone}
      />
      <Text style={[styles.pillText, { color: tone, writingDirection: wd }]}>
        {label}
      </Text>
    </View>
  );
}

function DebugRow({
  label,
  value,
  colors,
  wd,
  mono,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  wd: "ltr" | "rtl";
  mono?: boolean;
}) {
  return (
    <View style={[styles.debugRow, { borderTopColor: colors.border }]}>
      <Text
        style={[
          styles.debugLabel,
          { color: colors.mutedForeground, writingDirection: wd },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.debugValue,
          mono ? styles.debugValueMono : null,
          { color: colors.foreground },
        ]}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, gap: 18 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
    gap: 12,
  },
  bannerWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  muted: { fontSize: 13, fontFamily: "Inter_400Regular" },
  debugRow: {
    flexDirection: "column",
    gap: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  debugLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  debugValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  debugValueMono: { fontFamily: "Inter_500Medium", letterSpacing: 0.2 },
});
