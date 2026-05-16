import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { useT } from "@/src/i18n/useT";
import { webBottomInset, webTopInset } from "@/src/theme/theme";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lz, isRTL } = useT();
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(20)).current;
  const digitsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 6 }),
      Animated.timing(digitsAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
    ]).start();
  }, [fade, lift, digitsAnim]);

  const topPad = (Platform.OS === "web" ? webTopInset() : insets.top) + 24;
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;
  const writingDirection = isRTL ? "rtl" : "ltr";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientSoftFrom, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
            <View style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="settings" size={20} color={colors.foreground} />
            </View>
          </Pressable>
          <Pressable onPress={() => router.push("/how-to-play")} hitSlop={12}>
            <View style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="help-circle" size={20} color={colors.foreground} />
            </View>
          </Pressable>
        </View>

        <Animated.View style={[styles.hero, { opacity: fade, transform: [{ translateY: lift }] }]}>
          <Animated.View style={{ opacity: digitsAnim }}>
            <View style={styles.digitsRow} {...({ dir: "ltr" } as object)}>
              {["7", "3", "9"].map((d, i) => (
                <View
                  key={i}
                  style={[styles.digitChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.digitText, { color: colors.primary }]}>{lz(d)}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
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
            <Pressable onPress={() => router.push("/records")} style={styles.linkBtn}>
              <Feather name="award" size={16} color={colors.mutedForeground} />
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
                {t("home.records")}
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
  topBar: { flexDirection: "row", justifyContent: "space-between" },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  hero: { alignItems: "center", gap: 16 },
  digitsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  digitChip: {
    width: 56, height: 72, borderRadius: 18, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  digitText: { fontSize: 32, fontFamily: "Inter_700Bold" },
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
