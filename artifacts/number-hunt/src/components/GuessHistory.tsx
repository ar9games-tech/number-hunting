import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { feedbackLabel, type Feedback } from "@/src/utils/gameLogic";

export type HistoryItem = {
  guess: string;
  feedback: Feedback;
  by?: string;
};

export function GuessHistory({
  items,
  showCorrectCount,
  emptyText = "No guesses yet",
}: {
  items: HistoryItem[];
  showCorrectCount: boolean;
  emptyText?: string;
}) {
  const colors = useColors();
  if (items.length === 0) {
    return (
      <View style={[styles.empty, { borderColor: colors.border }]}>
        <Feather name="list" size={20} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{emptyText}</Text>
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
        const isHigh = it.feedback.level === "high" || it.feedback.level === "tooHigh";
        const isExtreme =
          it.feedback.level === "tooHigh" || it.feedback.level === "tooLow";
        const tone = it.feedback.correct
          ? colors.success
          : isExtreme
            ? colors.destructive
            : isHigh
              ? colors.warning
              : colors.primary;
        const arrow = it.feedback.correct ? "check" : isHigh ? "arrow-down" : "arrow-up";
        return (
          <View
            key={idx}
            style={[
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.guess, { color: colors.foreground }]}>{it.guess}</Text>
            <View style={[styles.chip, { backgroundColor: tone + "22" }]}>
              <Feather name={arrow} size={14} color={tone} />
              <Text style={[styles.chipText, { color: tone }]}>
                {feedbackLabel(it.feedback.level, it.feedback.correct)}
                {showCorrectCount && !it.feedback.correct
                  ? ` · ${it.feedback.correctDigitCount}`
                  : ""}
              </Text>
            </View>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  guess: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    minWidth: 56,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  by: {
    marginLeft: "auto",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
