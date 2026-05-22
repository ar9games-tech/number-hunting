import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import { webBottomInset, webTopInset } from "@/src/theme/theme";

/**
 * Home hero digits. Rendered LEFT-TO-RIGHT in every locale (including
 * Arabic) — the row container forces `dir: 'ltr'` + `flexDirection: 'row'`
 * and the chip text uses `writingDirection: 'ltr'` so the visual order is
 * always 3-6-9 / ٣-٦-٩ and never the bidi-reversed ٩-٦-٣. Localised
 * Arabic-Indic glyphs still come through via `lz()` in AR mode.
 */
const HERO_DIGITS = ["3", "6", "9"] as const;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, ready } = useSettings();
  const { t, lz, isRTL } = useT();
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(20)).current;

  // First-launch gate: brand-new installs land on /welcome to pick a
  // nickname. We wait for `ready` so we don't redirect on the default
  // (pre-load) settings snapshot. Migration in getSettings() flags
  // existing installs as already onboarded so they never see this.
  const needsOnboarding = ready && !settings.hasOnboarded;
  useEffect(() => {
    if (needsOnboarding) {
      router.replace("/welcome");
    }
  }, [needsOnboarding]);
  // One animated value per hero digit so we can stagger their entry —
  // this gives the home screen its "animated splash" feel without
  // needing a separate splash route.
  const digitAnims = useMemo(
    () => HERO_DIGITS.map(() => new Animated.Value(0)),
    [],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 6 }),
      Animated.stagger(
        140,
        digitAnims.map((v) =>
          Animated.spring(v, {
            toValue: 1,
            useNativeDriver: true,
            speed: 14,
            bounciness: 12,
          }),
        ),
      ),
    ]).start();
  }, [fade, lift, digitAnims]);

  const topPad = (Platform.OS === "web" ? webTopInset() : insets.top) + 24;
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;
  const writingDirection = isRTL ? "rtl" : "ltr";

  // While settings load (or while we're redirecting an un-onboarded user
  // off this screen), render a plain background — no flash of the full
  // home content before the navigation happens.
  if (!ready || needsOnboarding) {
    return <View style={[styles.root, { backgroundColor: colors.background }]} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientSoftFrom, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        {/* Top bar is force-LTR so the Store button stays in the
            visual top-LEFT corner in Arabic too (Arabic would otherwise
            mirror flex-row and push it to the right). Help stays
            top-right in both languages. */}
        <View style={styles.topBar} {...({ dir: "ltr" } as object)}>
          <View style={styles.topLeftCluster}>
            <Pressable
              onPress={() => router.push("/store")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("home.store")}
            >
              <View
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Feather name="shopping-bag" size={18} color={colors.primary} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("settings.title")}
            >
              <View style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="settings" size={20} color={colors.foreground} />
              </View>
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push("/how-to-play")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("home.howto")}
          >
            <View style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="help-circle" size={20} color={colors.foreground} />
            </View>
          </Pressable>
        </View>

        <Animated.View style={[styles.hero, { opacity: fade, transform: [{ translateY: lift }] }]}>
          <View style={styles.digitsRow} {...({ dir: "ltr" } as object)}>
            {HERO_DIGITS.map((d, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.digitChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.primary,
                    opacity: digitAnims[i]!,
                    transform: [
                      {
                        scale: digitAnims[i]!.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.4, 1],
                        }),
                      },
                      {
                        translateY: digitAnims[i]!.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-12, 0],
                        }),
                      },
                    ],
                    shadowColor: colors.primary,
                    shadowOpacity: 0.35,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 4,
                  },
                ]}
              >
                <Text
                  style={[styles.digitText, { color: colors.primary }]}
                  // Numbers must always read left-to-right, even in
                  // Arabic mode — pin writingDirection to 'ltr' on the
                  // text node itself so bidi reordering can never flip
                  // a multi-char number (defensive — single-glyph chips
                  // don't need it today, but future "12" / "369" chips
                  // would be silently reversed without this).
                  {...({ dir: "ltr" } as object)}
                >
                  {lz(d)}
                </Text>
              </Animated.View>
            ))}
          </View>
          <Text style={[styles.title, { color: colors.foreground, writingDirection }]}>
            {t("home.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, writingDirection }]}>
            {t("home.subtitle")}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.actions, { opacity: fade }]}>
          <Button
            title={t("home.solo")}
            fullWidth
            size="lg"
            onPress={() => router.push({ pathname: "/difficulty", params: { mode: "solo" } })}
          />
          <Button
            title={t("home.multiplayer")}
            fullWidth
            size="lg"
            variant="secondary"
            onPress={() => router.push("/lobby")}
          />
          <View style={styles.linksRow}>
            <Pressable onPress={() => router.push("/profile")} style={styles.linkBtn}>
              <Feather name="user" size={16} color={colors.mutedForeground} />
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
                {t("home.profile")}
              </Text>
            </Pressable>
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
            <Pressable onPress={() => router.push("/achievements")} style={styles.linkBtn}>
              <Feather name="award" size={16} color={colors.mutedForeground} />
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
                {t("home.achievements")}
              </Text>
            </Pressable>
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
            <Pressable onPress={() => router.push("/how-to-play")} style={styles.linkBtn}>
              <Feather name="book-open" size={16} color={colors.mutedForeground} />
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
                {t("home.howto")}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    direction: "ltr",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  topLeftCluster: { flexDirection: "row", direction: "ltr", gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  hero: { alignItems: "center", gap: 16 },
  // Force LTR layout on the digit row so Arabic mode shows 3-6-9 / ٣-٦-٩
  // in the correct visual order, never bidi-flipped to 9-6-3 / ٩-٦-٣.
  digitsRow: {
    flexDirection: "row",
    direction: "ltr",
    gap: 10,
    marginBottom: 8,
  },
  digitChip: {
    width: 56, height: 72, borderRadius: 18, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  digitText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    writingDirection: "ltr",
  },
  title: { fontSize: 44, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -1 },
  subtitle: { fontSize: 16, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 22 },
  actions: { gap: 12 },
  linksRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 12,
  },
  linkBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 8,
  },
  linkText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
