import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useT } from "@/src/i18n/useT";
import { type Feedback } from "@/src/utils/gameLogic";

/**
 * Renders the most recent guess outcome with a tone-coloured icon, animated
 * fade/slide entry, and a glow border that pulses each time a new feedback
 * arrives.
 */
export function FeedbackCard({
  feedback,
  showCorrectCount,
  guess,
}: {
  feedback: Feedback | null;
  showCorrectCount: boolean;
  guess?: string;
}) {
  const colors = useColors();
  const { t, lz, isRTL } = useT();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(8)).current;
  // Glow drives both the animated border colour and the shadow opacity.
  // useNativeDriver:false because we interpolate colours and shadowOpacity,
  // neither of which the native driver supports.
  const glow = useRef(new Animated.Value(0)).current;
  const wd = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    if (!feedback) return;
    fade.setValue(0);
    slide.setValue(8);
    glow.setValue(0);
    Animated.parallel([
      // All driven on JS — the same Animated.View animates borderColor and
      // shadowOpacity (which require JS driver), so opacity/transform must
      // also be JS to avoid "node moved to native earlier" crashes.
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: false, speed: 18, bounciness: 6 }),
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 280, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.4, duration: 700, useNativeDriver: false }),
      ]),
    ]).start();
  }, [feedback, fade, slide, glow]);

  if (!feedback) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text
          style={[styles.placeholder, { color: colors.mutedForeground, writingDirection: wd }]}
        >
          {t("fb.makeFirst")}
        </Text>
      </View>
    );
  }

  const isHigh = feedback.level === "high" || feedback.level === "tooHigh";
  const isExtreme = feedback.level === "tooHigh" || feedback.level === "tooLow";
  const tone = feedback.correct
    ? colors.success
    : isExtreme
      ? colors.destructive
      : isHigh
        ? colors.warning
        : colors.primary;
  const labelKey = feedback.correct
    ? "fb.correct"
    : feedback.level === "tooHigh"
      ? "fb.tooHigh"
      : feedback.level === "tooLow"
        ? "fb.tooLow"
        : feedback.level === "high"
          ? "fb.high"
          : "fb.low";
  const label = t(labelKey);
  const icon = feedback.correct ? "check-circle" : isHigh ? "arrow-down" : "arrow-up";

  // Animated tint that interpolates between the resting border and the
  // tone colour at peak glow.
  const animatedBorder = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, tone],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: animatedBorder,
          opacity: fade,
          transform: [{ translateY: slide }],
          // shadow / glow halo
          shadowColor: tone,
          shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
          // Android shadow approximation (elevation can't animate, so we
          // give it a constant lift and rely on the border tint).
          elevation: Platform.OS === "android" ? 4 : 0,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tone + "22" }]}>
        <Feather name={icon} size={22} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.foreground, writingDirection: wd }]}>
          {label}
          {guess ? ` — ${lz(guess)}` : ""}
        </Text>
        {showCorrectCount && !feedback.correct && feedback.correctDigitCount != null ? (
          <Text style={[styles.sub, { color: colors.mutedForeground, writingDirection: wd }]}>
            {feedback.correctDigitCount === 1
              ? t("fb.correctDigit", { n: feedback.correctDigitCount })
              : t("fb.correctDigits", { n: feedback.correctDigitCount })}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 18, borderWidth: 1.5, minHeight: 64,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sub: { marginTop: 2, fontSize: 13, fontFamily: "Inter_400Regular" },
  placeholder: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
