import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/src/contexts/SettingsContext";

export type GlassTone = "neutral" | "success" | "warning" | "danger" | "primary";

/**
 * Translucent "glassmorphism" surface used for hero cards across the app.
 *
 * On native we use expo-blur's BlurView for real backdrop blur. On web we
 * fall back to a translucent background + CSS `backdrop-filter`, which is
 * widely supported by modern browsers and lets the gradient bleed through.
 *
 * The `tone` prop tints the border so callers can flag state (success on a
 * winning result card, danger on a defeat, etc.) without writing styles.
 */
export function GlassCard({
  children,
  style,
  intensity = 35,
  tone = "neutral",
  radius = 22,
}: {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  tone?: GlassTone;
  radius?: number;
}) {
  const colors = useColors();
  const { effectiveScheme } = useSettings();

  const toneColor =
    tone === "success"
      ? colors.success
      : tone === "danger"
        ? colors.destructive
        : tone === "warning"
          ? colors.warning
          : tone === "primary"
            ? colors.primary
            : colors.border;

  const borderWidth = tone === "neutral" ? StyleSheet.hairlineWidth : 1.5;

  // Web: BlurView's web implementation is heavy and inconsistent. Render a
  // plain View with the equivalent visuals (translucency + backdrop-filter).
  if (Platform.OS === "web") {
    const innerBg =
      effectiveScheme === "dark" ? "rgba(20, 26, 42, 0.55)" : "rgba(255, 255, 255, 0.6)";
    // backdropFilter is web-only and not in RN's ViewStyle type, so cast.
    const webStyle = {
      backgroundColor: innerBg,
      borderColor: toneColor,
      borderWidth,
      borderRadius: radius,
      backdropFilter: "blur(18px) saturate(140%)",
      WebkitBackdropFilter: "blur(18px) saturate(140%)",
    } as unknown as ViewStyle;
    return <View style={[webStyle, style]}>{children}</View>;
  }

  return (
    <BlurView
      intensity={intensity}
      tint={effectiveScheme === "dark" ? "dark" : "light"}
      style={[
        styles.base,
        { borderRadius: radius, borderColor: toneColor, borderWidth },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
