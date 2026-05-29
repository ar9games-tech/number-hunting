import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useT } from "@/src/i18n/useT";
import { type Feedback } from "@/src/utils/gameLogic";

export type HistoryItem = {
  guess: string;
  feedback: Feedback;
  by?: string;
  /** Optimistic row: the guess was just sent and we're awaiting the
   *  server's feedback. Renders the digits immediately with a spinner. */
  pending?: boolean;
};

export function GuessHistory({
  items,
  showCorrectCount,
  emptyText,
}: {
  items: HistoryItem[];
  showCorrectCount: boolean;
  emptyText?: string;
}) {
  const colors = useColors();
  const { t, lz, isRTL } = useT();
  const empty = emptyText ?? t("misc.noGuesses");
  const wd = isRTL ? "rtl" : "ltr";
  if (items.length === 0) {
    return (
      <View style={[styles.empty, { borderColor: colors.border }]}>
        <Feather name="list" size={20} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{empty}</Text>
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {items.map((it, idx) => {
        if (it.pending) {
          return (
            <View
              key={idx}
              style={[
                styles.row,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.7 },
              ]}
            >
              <Text style={[styles.guess, { color: colors.foreground }]}>{lz(it.guess)}</Text>
              <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              </View>
            </View>
          );
        }
        const isHigh = it.feedback.level === "high" || it.feedback.level === "tooHigh";
        const isExtreme = it.feedback.level === "tooHigh" || it.feedback.level === "tooLow";
        const tone = it.feedback.correct
          ? colors.success
          : isExtreme
            ? colors.destructive
            : isHigh
              ? colors.warning
              : colors.primary;
        const arrow = it.feedback.correct ? "check" : isHigh ? "arrow-down" : "arrow-up";
        const labelKey = it.feedback.correct
          ? "fb.correct"
          : it.feedback.level === "tooHigh"
            ? "fb.tooHigh"
            : it.feedback.level === "tooLow"
              ? "fb.tooLow"
              : it.feedback.level === "high"
                ? "fb.high"
                : "fb.low";
        return (
          <View
            key={idx}
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.guess, { color: colors.foreground }]}>{lz(it.guess)}</Text>
            {/* Feedback chip: arrow icon + label word. Per UX feedback the
                count is now a separate sibling pill instead of being
                glued onto the label with a "·" bullet — that bullet
                looked like errant punctuation right after the Arabic
                feedback words (مرتفع/منخفض…) and pulled the eye away
                from the number beside it. Keeping them as siblings also
                lets the chip wrap cleanly in RTL. */}
            <View style={[styles.chip, { backgroundColor: tone + "22" }]}>
              <Feather name={arrow} size={14} color={tone} />
              <Text
                style={[styles.chipText, { color: tone, writingDirection: wd }]}
              >
                {t(labelKey)}
              </Text>
            </View>
            {showCorrectCount &&
            !it.feedback.correct &&
            it.feedback.correctDigitCount != null ? (
              <View style={[styles.countPill, { backgroundColor: tone + "14" }]}>
                <Text style={[styles.countText, { color: tone }]}>
                  {lz(it.feedback.correctDigitCount)}
                </Text>
              </View>
            ) : null}
            {it.by ? (
              <Text style={[styles.by, { color: colors.mutedForeground }]}>{it.by}</Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 8, paddingVertical: 4 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1,
  },
  guess: {
    fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 1, minWidth: 56,
  },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  // Sibling count pill — keeps the correct-digit number visually
  // separate from the feedback word so neither needs a punctuation
  // separator. Slightly lighter background than the feedback chip so
  // it reads as secondary information at a glance.
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  by: { marginLeft: "auto", fontSize: 12, fontFamily: "Inter_500Medium" },
  empty: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 16, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", justifyContent: "center",
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
