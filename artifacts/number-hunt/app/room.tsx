import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { GuessHistory, type HistoryItem } from "@/src/components/GuessHistory";
import { GuessInput } from "@/src/components/GuessInput";
import { NumericKeypad } from "@/src/components/NumericKeypad";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import {
  createRoom,
  getCachedRoom,
  joinRoom,
  leaveRoom,
  onRoomClosed,
  onUpdate,
  submitGuess,
  type RoomState,
} from "@/src/net/socketPlaceholder";
import { webBottomInset } from "@/src/theme/theme";
import { isValidGuess, type Digits } from "@/src/utils/gameLogic";

type ViewRole = "host" | "guest";

export default function RoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { t, isRTL, lz } = useT();
  const params = useLocalSearchParams<{ code?: string; role?: string; digits?: string }>();

  const initialRole = (params.role as ViewRole) ?? "host";
  const digits = (Math.min(4, Math.max(2, parseInt(params.digits ?? "3", 10))) || 3) as Digits;

  const [state, setState] = useState<RoomState | null>(null);
  const [guessInput, setGuessInput] = useState("");

  // 1) Initial create/join
  useEffect(() => {
    let cancelled = false;
    const incomingCode = (params.code ?? "").toUpperCase();

    (async () => {
      try {
        // Rematch path: we already have a live identity + cached state for
        // this room (returned from the /result screen). Just re-attach
        // — do NOT create or rejoin, which would spawn a duplicate room
        // (host) or hit the "room full" guard (guest).
        const cached = incomingCode ? getCachedRoom(incomingCode) : null;
        if (cached) {
          setState(cached);
          return;
        }
        if (initialRole === "host") {
          const room = await createRoom(
            digits,
            settings.playerName || t("misc.player1"),
          );
          if (cancelled) return;
          setState(room);
        } else {
          const room = await joinRoom(
            incomingCode,
            settings.playerName || t("misc.player2"),
          );
          if (cancelled) return;
          if (!room) {
            Alert.alert(t("room.notFound"), t("room.returningLobby"));
            router.replace("/lobby");
            return;
          }
          setState(room);
        }
      } catch {
        if (cancelled) return;
        Alert.alert(t("room.notFound"), t("room.returningLobby"));
        router.replace("/lobby");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Subscribe to live updates
  useEffect(() => {
    if (!state?.code) return;
    const unsubState = onUpdate(state.code, (s) => setState(s));
    const unsubClosed = onRoomClosed(state.code, () => {
      Alert.alert(t("room.closedTitle"), t("room.closedMsg"));
      router.replace("/lobby");
    });
    return () => {
      unsubState();
      unsubClosed();
    };
  }, [state?.code, t]);

  // 3) Navigate to result on win
  useEffect(() => {
    if (state?.status === "won" && state.revealedHidden) {
      const winnerName = state.winner === "host" ? state.hostName : state.guestName;
      router.replace({
        pathname: "/result",
        params: {
          mode: "online",
          digits: String(state.digits),
          guesses: String(state.yourHistory.length),
          won: state.winner === state.yourRole ? "1" : "0",
          winnerName,
          code: state.code,
          hidden: state.revealedHidden,
          role: state.yourRole,
        },
      });
    }
  }, [state?.status, state?.revealedHidden]);

  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 12;
  const showCount = digits >= 3;
  const wd = isRTL ? "rtl" : "ltr";

  if (!state) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t("room.title", { code: "…" })} />
      </View>
    );
  }

  const opponentName =
    state.yourRole === "host" ? state.guestName : state.hostName;

  const historyItems: HistoryItem[] = state.yourHistory.map((h) => ({
    guess: h.guess,
    feedback: h.feedback,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t("room.title", { code: state.code })}
        rightSlot={
          <Pressable
            onPress={() => {
              leaveRoom(state.code);
              router.replace("/lobby");
            }}
            hitSlop={12}
          >
            <Feather name="log-out" size={20} color={colors.destructive} />
          </Pressable>
        }
      />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        {/* Top status banner */}
        <View style={[styles.banner, { backgroundColor: colors.secondary }]}>
          <Feather
            name={state.status === "waiting" ? "clock" : "zap"}
            size={14}
            color={colors.secondaryForeground}
          />
          <Text
            style={[
              styles.bannerText,
              { color: colors.secondaryForeground, writingDirection: wd },
            ]}
          >
            {state.status === "waiting"
              ? t("room.waitingOpponent")
              : t("room.race", { n: digits })}
          </Text>
        </View>

        {/* Role + opponent guess counter */}
        <View style={styles.metaRow}>
          <View style={[styles.chip, { backgroundColor: colors.muted }]}>
            <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
              {t(state.yourRole === "host" ? "room.youHost" : "room.youGuest")}
            </Text>
          </View>
          {state.status === "playing" ? (
            <View style={[styles.chip, { backgroundColor: colors.muted }]}>
              <Feather name="user" size={11} color={colors.mutedForeground} />
              <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                {t("room.opponentGuesses", {
                  name: opponentName,
                  n: lz(state.opponentGuessCount),
                })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Waiting (host only) — shareable code panel */}
        {state.status === "waiting" ? (
          <View style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.shareLabel, { color: colors.mutedForeground }]}>
              {t("room.shareCode")}
            </Text>
            <View style={styles.codeRow}>
              <Text style={[styles.codeText, { color: colors.foreground }]}>{state.code}</Text>
            </View>
            <Text style={[styles.shareHint, { color: colors.mutedForeground, writingDirection: wd }]}>
              {t("room.shareHint")}
            </Text>
          </View>
        ) : null}

        {/* Playing — own history + keypad */}
        {state.status === "playing" ? (
          <>
            <View style={styles.historyWrap}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {t("room.yourGuesses")}
              </Text>
              <GuessHistory items={historyItems} showCorrectCount={showCount} />
            </View>
            <View style={styles.bottom}>
              <GuessInput value={guessInput} digits={digits} />
              <NumericKeypad
                onDigit={(d) =>
                  setGuessInput(guessInput.length < digits ? guessInput + d : guessInput)
                }
                onBackspace={() => setGuessInput(guessInput.slice(0, -1))}
                onSubmit={() => {
                  if (isValidGuess(guessInput, digits)) {
                    submitGuess(state.code, guessInput);
                    setGuessInput("");
                  }
                }}
                canSubmit={isValidGuess(guessInput, digits)}
              />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, gap: 12 },
  banner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: "center",
  },
  bannerText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  metaRow: { flexDirection: "row", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  shareCard: {
    padding: 20, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 10,
  },
  shareLabel: {
    fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold",
  },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  codeText: {
    fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: 8,
  },
  shareHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  label: { fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  historyWrap: { flex: 1, gap: 8 },
  bottom: { gap: 12 },
});
