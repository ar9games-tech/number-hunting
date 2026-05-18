import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { GlassCard, type GlassTone } from "@/src/components/GlassCard";
import { useT } from "@/src/i18n/useT";
import { getAchievementDef } from "@/src/achievements/catalog";

/**
 * One-line "Achievement Unlocked" card shown on the Result screen. Slides
 * in with a stagger when multiple unlocks land in the same game.
 */
export function AchievementBanner({
  id,
  index = 0,
}: {
  id: string;
  index?: number;
}) {
  const colors = useColors();
  const { t, isRTL } = useT();
  const def = getAchievementDef(id);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  const wd = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 380,
        delay: 200 + index * 140,
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        delay: 200 + index * 140,
        useNativeDriver: true,
        speed: 14,
        bounciness: 8,
      }),
    ]).start();
  }, [fade, slide, index]);

  if (!def) return null;

  const tone = toneToColor(def.tone, colors);
  const glassTone: GlassTone =
    def.tone === "danger"
      ? "danger"
      : def.tone === "success"
        ? "success"
        : def.tone === "warning"
          ? "warning"
          : "primary";

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      <GlassCard tone={glassTone} style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: tone + "22" }]}>
          <Feather name={def.icon} size={20} color={tone} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={[styles.label, { color: tone, writingDirection: wd }]}
            numberOfLines={1}
          >
            {t("ach.unlocked")}
          </Text>
          <Text
            style={[styles.title, { color: colors.foreground, writingDirection: wd }]}
            numberOfLines={1}
          >
            {t(def.titleKey)}
          </Text>
        </View>
        <Feather name="check-circle" size={20} color={tone} />
      </GlassCard>
    </Animated.View>
  );
}

function toneToColor(
  tone: "primary" | "success" | "warning" | "danger" | "accent",
  colors: ReturnType<typeof useColors>,
): string {
  switch (tone) {
    case "success":
      return colors.success;
    case "warning":
      return colors.warning;
    case "danger":
      return colors.destructive;
    case "accent":
      return colors.accent;
    case "primary":
    default:
      return colors.primary;
  }
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
