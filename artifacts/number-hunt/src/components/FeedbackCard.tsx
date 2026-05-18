import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useT } from "@/src/i18n/useT";
import { type Feedback } from "@/src/utils/gameLogic";

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
  const wd = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    if (!feedback) return;
    fade.setValue(0);
    slide.setValue(8);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }),
    ]).start();
  }, [feedback, fade, slide]);

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

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: tone,
          opacity: fade,
          transform: [{ translateY: slide }],
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
