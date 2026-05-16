import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { FeedbackCard } from "@/src/components/FeedbackCard";
import { GuessHistory, type HistoryItem } from "@/src/components/GuessHistory";
import { GuessInput } from "@/src/components/GuessInput";
import { NumberDisplay } from "@/src/components/NumberDisplay";
import { NumericKeypad } from "@/src/components/NumericKeypad";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Timer } from "@/src/components/Timer";
import { useSettings } from "@/src/contexts/SettingsContext";
import { saveRecordIfBest } from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";
import {
  evaluateGuess,
  generateHidden,
  isValidGuess,
  type Digits,
  type Feedback,
} from "@/src/utils/gameLogic";

export default function SoloGameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const params = useLocalSearchParams<{ digits?: string }>();
  const digits = (Math.min(4, Math.max(2, parseInt(params.digits ?? "3", 10))) || 3) as Digits;

  const hidden = useMemo(
    () => generateHidden(digits, settings.allowLeadingZero),
    [digits, settings.allowLeadingZero],
  );

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastFeedback, setLastFeedback] = useState<Feedback | null>(null);
  const [lastGuess, setLastGuess] = useState<string | undefined>();
  const [running, setRunning] = useState(true);
  const elapsedRef = useRef(0);
  const startedAt = useRef(Date.now());
  const finished = useRef(false);

  const showCount = digits >= 3;
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 12;

  const onSubmit = () => {
    if (!isValidGuess(input, digits) || finished.current) return;
    const fb = evaluateGuess(input, hidden);
    const guess = input;
    const nextCount = history.length + 1;
    setLastGuess(guess);
    setLastFeedback(fb);
    setHistory((h) => [{ guess, feedback: fb }, ...h]);
    setInput("");

    if (fb.correct) {
      finished.current = true;
      // Compute final elapsed precisely from start time, ignoring tick latency.
      const finalElapsed = Math.max(
        elapsedRef.current,
        Math.floor((Date.now() - startedAt.current) / 1000),
      );
      setRunning(false);
      void (async () => {
        const { wasBest } = await saveRecordIfBest(digits, finalElapsed, nextCount);
        router.replace({
          pathname: "/result",
          params: {
            mode: "solo",
            digits: String(digits),
            timeSec: String(finalElapsed),
            guesses: String(nextCount),
            isNewRecord: wasBest ? "1" : "0",
            won: "1",
            hidden,
          },
        });
      })();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={`${digits}-Digit · Solo`}
        rightSlot={
          <Timer
            running={running}
            onTick={(s) => {
              elapsedRef.current = s;
            }}
          />
        }
      />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        <View style={styles.top}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>HIDDEN NUMBER</Text>
          <NumberDisplay digits={digits} reveal={lastFeedback?.correct ? hidden : null} />
        </View>

        <FeedbackCard feedback={lastFeedback} guess={lastGuess} showCorrectCount={showCount} />

        <View style={styles.historyWrap}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>HISTORY</Text>
          <GuessHistory items={history} showCorrectCount={showCount} />
        </View>

        <View style={styles.bottom}>
          <GuessInput value={input} digits={digits} />
          <NumericKeypad
            onDigit={(d) => setInput((v) => (v.length < digits ? v + d : v))}
            onBackspace={() => setInput((v) => v.slice(0, -1))}
            onSubmit={onSubmit}
            canSubmit={isValidGuess(input, digits)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  top: {
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Inter_600SemiBold",
  },
  historyWrap: {
    flex: 1,
    gap: 8,
  },
  bottom: {
    gap: 12,
  },
});
