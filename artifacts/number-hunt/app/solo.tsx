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
import { useT } from "@/src/i18n/useT";
import { recordWin, saveRecordIfBest } from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";
import {
  evaluateGuess,
  generateHidden,
  isValidGuess,
  type Digits,
  type Feedback,
} from "@/src/utils/gameLogic";

/**
 * How long to lock the keypad after an auto-submitted guess fires. Long
 * enough to swallow any stray double-tap on the digit key that completed
 * the input, but short enough that fast players can chain guesses.
 */
const AUTO_SUBMIT_LOCK_MS = 250;
/** Tiny delay so the user visually sees the final digit land before submit. */
const AUTO_SUBMIT_DELAY_MS = 130;

export default function SoloGameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { t } = useT();
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

  // Lock that prevents the same completed guess from being submitted twice
  // — e.g. if a digit press fires the auto-submit and the user taps a key
  // again during the brief delay window.
  const submittingRef = useRef(false);
  const [locked, setLocked] = useState(false);

  const showCount = digits >= 3;
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 12;

  const submitGuess = (guess: string) => {
    if (submittingRef.current || finished.current) return;
    if (!isValidGuess(guess, digits)) return;
    submittingRef.current = true;
    setLocked(true);

    const fb = evaluateGuess(guess, hidden, digits);
    const nextCount = history.length + 1;
    setLastGuess(guess);
    setLastFeedback(fb);
    setHistory((h) => [{ guess, feedback: fb }, ...h]);
    setInput("");

    if (fb.correct) {
      finished.current = true;
      const finalElapsed = Math.max(
        elapsedRef.current,
        Math.floor((Date.now() - startedAt.current) / 1000),
      );
      setRunning(false);
      void (async () => {
        // Persist both the single-best snapshot (records) and the lifetime
        // aggregate (stats) + evaluate achievements. Running in parallel
        // so navigation isn't blocked.
        const [{ wasBest }, { newUnlocks }] = await Promise.all([
          saveRecordIfBest(digits, finalElapsed, nextCount),
          recordWin({
            mode: "solo",
            digits,
            guesses: nextCount,
            timeSec: finalElapsed,
          }),
        ]);
        router.replace({
          pathname: "/result",
          params: {
            mode: "solo",
            unlocks: newUnlocks.join(","),
            digits: String(digits),
            timeSec: String(finalElapsed),
            guesses: String(nextCount),
            isNewRecord: wasBest ? "1" : "0",
            won: "1",
            hidden,
          },
        });
      })();
      return; // keep lock engaged until navigation
    }

    setTimeout(() => {
      submittingRef.current = false;
      setLocked(false);
    }, AUTO_SUBMIT_LOCK_MS);
  };

  const onDigit = (d: string) => {
    if (submittingRef.current || finished.current) return;
    setInput((v) => {
      if (v.length >= digits) return v;
      const next = v + d;
      // Auto-submit the moment the input is full. Small delay lets the
      // final digit render in GuessInput before the row clears.
      if (next.length === digits) {
        setTimeout(() => submitGuess(next), AUTO_SUBMIT_DELAY_MS);
      }
      return next;
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t("solo.title", { n: digits })}
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
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {t("solo.hidden")}
          </Text>
          <NumberDisplay digits={digits} reveal={lastFeedback?.correct ? hidden : null} />
        </View>

        <FeedbackCard feedback={lastFeedback} guess={lastGuess} showCorrectCount={showCount} />

        <View style={styles.historyWrap}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {t("solo.history")}
          </Text>
          <GuessHistory items={history} showCorrectCount={showCount} />
        </View>

        <View style={styles.bottom}>
          <GuessInput value={input} digits={digits} />
          <NumericKeypad
            onDigit={onDigit}
            onBackspace={() => setInput((v) => v.slice(0, -1))}
            onClear={() => setInput("")}
            disabled={locked || finished.current}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, gap: 16 },
  top: { alignItems: "center", gap: 10, paddingTop: 8 },
  label: { fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  historyWrap: { flex: 1, gap: 8 },
  bottom: { gap: 12 },
});
