import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { GuessHistory, type HistoryItem } from "@/src/components/GuessHistory";
import { GuessInput } from "@/src/components/GuessInput";
import { NumericKeypad } from "@/src/components/NumericKeypad";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import {
  getCachedRoom,
  joinRoom,
  leaveRoom,
  onRoomClosed,
  onUpdate,
  setRoomDigits,
  submitGuess as sendGuess,
  type RoomState,
} from "@/src/net/socketPlaceholder";
import { formatPlayerIdentity } from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";
import { isValidGuess, normalizeDigits } from "@/src/utils/gameLogic";

/** Safety fallback only — the lock is normally released as soon as the
 *  server acknowledges the guess by extending the player's history. */
const AUTO_SUBMIT_LOCK_MS = 3000;
const AUTO_SUBMIT_DELAY_MS = 130;

export default function RoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, ready } = useSettings();
  const { t, isRTL, lz } = useT();
  const params = useLocalSearchParams<{ code?: string }>();

  const [state, setState] = useState<RoomState | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  // Online round timer — captured the first time status flips to "playing"
  // and frozen the first time it flips to "won". Passed to /result so the
  // result screen can save a per-digit best time when the player wins.
  const roundStartedAtRef = useRef<number | null>(null);
  const roundElapsedSecRef = useRef<number>(0);
  // History length the server must reach before we release the lock. -1
  // means "not waiting for an ack right now".
  const pendingHistoryLenRef = useRef(-1);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locked, setLocked] = useState(false);

  const releaseLock = () => {
    submittingRef.current = false;
    pendingHistoryLenRef.current = -1;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setLocked(false);
  };

  // Guard: online play needs a profile. Bounce missing identities back to
  // the welcome screen.
  useEffect(() => {
    if (ready && (!settings.hasOnboarded || !settings.playerName.trim())) {
      router.replace("/welcome");
    }
  }, [ready, settings.hasOnboarded, settings.playerName]);

  // 1) Attach to the room. Either we already have cached state (we just
  //    created it, or we're re-attaching after a result screen) or we need
  //    to join with the saved identity.
  useEffect(() => {
    let cancelled = false;
    const code = (params.code ?? "").toUpperCase();
    if (!code) {
      router.replace("/lobby");
      return;
    }
    const identity = formatPlayerIdentity(settings.playerName, settings.playerSerial);
    if (!identity) return; // welcome-redirect will fire on next tick

    (async () => {
      try {
        const cached = getCachedRoom(code);
        if (cached) {
          setState(cached);
          return;
        }
        const res = await joinRoom(code, identity);
        if (cancelled) return;
        if (!res.ok) {
          const title =
            res.error === "full"
              ? t("lobby.joinFull")
              : res.error === "started"
                ? t("lobby.joinStarted")
                : t("lobby.notFound");
          Alert.alert(title, t("room.returningLobby"));
          router.replace("/lobby");
          return;
        }
        setState(res.state);
      } catch {
        if (cancelled) return;
        Alert.alert(t("room.connectErrorTitle"), t("room.connectErrorMsg"));
        router.replace("/lobby");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code, settings.playerName, settings.playerSerial]);

  // 2) Subscribe to live updates.
  useEffect(() => {
    if (!state?.code) return;
    const code = state.code;
    const unsubState = onUpdate(code, (s) => setState(s));
    const unsubClosed = onRoomClosed(code, () => {
      Alert.alert(t("room.closedTitle"), t("room.closedMsg"));
      router.replace("/lobby");
    });
    return () => {
      unsubState();
      unsubClosed();
    };
  }, [state?.code, t]);

  // Track round start / end for the online timer.
  useEffect(() => {
    if (state?.status === "playing" && roundStartedAtRef.current == null) {
      roundStartedAtRef.current = Date.now();
      roundElapsedSecRef.current = 0;
    }
    if (state?.status !== "playing" && state?.status !== "won") {
      // Reset between rounds (e.g. rematch back to waiting).
      roundStartedAtRef.current = null;
      roundElapsedSecRef.current = 0;
    }
  }, [state?.status]);

  // 3) Navigate to result on win.
  useEffect(() => {
    if (state?.status === "won" && state.revealedHidden && state.digits) {
      const startedAt = roundStartedAtRef.current;
      const elapsed = startedAt != null
        ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
        : 0;
      roundElapsedSecRef.current = elapsed;
      router.replace({
        pathname: "/result",
        params: {
          mode: "online",
          digits: String(state.digits),
          guesses: String(state.yourHistory.length),
          // Only meaningful (and only saved) when the player won.
          timeSec: String(elapsed),
          // Identity is id-based: names aren't unique within a room.
          won: state.winnerId && state.winnerId === state.yourId ? "1" : "0",
          winnerName: state.winnerName ?? "",
          code: state.code,
          hidden: state.revealedHidden,
        },
      });
    }
  }, [state?.status, state?.revealedHidden]);

  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 12;
  const wd = isRTL ? "rtl" : "ltr";

  const digits = state?.digits ?? null;
  const showCount = (digits ?? 0) >= 3;

  const submitNow = (rawGuess: string) => {
    if (submittingRef.current) return;
    if (!state || state.status !== "playing" || !digits) return;
    // Normalise Arabic digits → English before validating or sending.
    const guess = normalizeDigits(rawGuess);
    if (!guess || !isValidGuess(guess, digits)) return;
    submittingRef.current = true;
    setLocked(true);
    // Expect the server to grow our history by exactly one entry. The
    // ack-watcher effect (below) releases the lock the moment that lands.
    pendingHistoryLenRef.current = state.yourHistory.length + 1;
    try {
      sendGuess(state.code, guess);
    } catch {
      Alert.alert(t("room.sendErrorTitle"), t("room.sendErrorMsg"));
      releaseLock();
      setGuessInput("");
      return;
    }
    // Clear input only after the send attempt has been made (and any error
    // surfaced) — never leave the input populated mid-flight.
    setGuessInput("");
    // Safety net in case the server drops the ack — release after 3s even
    // without confirmation so the player is never permanently locked out.
    fallbackTimerRef.current = setTimeout(() => {
      releaseLock();
    }, AUTO_SUBMIT_LOCK_MS);
  };

  // Ack-based unlock: when the server confirms our guess by extending
  // yourHistory, release the lock immediately so the player can submit
  // again without waiting for the fixed timeout.
  useEffect(() => {
    const len = state?.yourHistory.length ?? 0;
    if (
      pendingHistoryLenRef.current >= 0 &&
      len >= pendingHistoryLenRef.current
    ) {
      releaseLock();
    }
  }, [state?.yourHistory.length]);

  // Clear any pending fallback timer on unmount.
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const onDigit = (d: string) => {
    if (submittingRef.current) return;
    if (!state || state.status !== "playing" || !digits) return;
    setGuessInput((v) => {
      if (v.length >= digits) return v;
      const next = v + d;
      if (next.length === digits) {
        setTimeout(() => submitNow(next), AUTO_SUBMIT_DELAY_MS);
      }
      return next;
    });
  };

  const onPickDigits = (n: 2 | 3 | 4) => {
    if (!state) return;
    setError(null);
    if (state.players.length < state.maxPlayers) {
      setError(t("room.cantStartYet"));
      return;
    }
    setRoomDigits(state.code, n);
  };

  const historyItems: HistoryItem[] = useMemo(
    () =>
      state
        ? state.yourHistory.map((h) => ({ guess: h.guess, feedback: h.feedback }))
        : [],
    [state],
  );

  if (!state) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t("room.title", { code: "…" })} />
      </View>
    );
  }

  const playerCount = state.players.length;
  const isFull = playerCount >= state.maxPlayers;
  const inLobby = state.status === "waiting";

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
            accessibilityLabel={t("room.leave")}
          >
            <Feather name="log-out" size={20} color={colors.destructive} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View style={[styles.banner, { backgroundColor: colors.secondary }]}>
          <Feather
            name={inLobby ? (isFull ? "check-circle" : "clock") : "zap"}
            size={14}
            color={colors.secondaryForeground}
          />
          <Text
            style={[
              styles.bannerText,
              { color: colors.secondaryForeground, writingDirection: wd },
            ]}
          >
            {inLobby
              ? isFull
                ? t("room.full")
                : t("room.waitingMore")
              : digits
                ? t("room.race", { n: digits })
                : ""}
          </Text>
        </View>

        {/* Player count pill + share code */}
        {inLobby ? (
          <View style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.shareLabel, { color: colors.mutedForeground }]}>
              {t("room.shareCode")}
            </Text>
            <Text style={[styles.codeText, { color: colors.foreground }]}>
              {state.code}
            </Text>
            <View style={[styles.countPill, { backgroundColor: colors.muted }]}>
              <Feather name="users" size={12} color={colors.mutedForeground} />
              <Text style={[styles.countPillText, { color: colors.mutedForeground }]}>
                {t("room.playersCount", {
                  n: lz(playerCount),
                  m: lz(state.maxPlayers),
                })}
              </Text>
            </View>
            <Text style={[styles.shareHint, { color: colors.mutedForeground, writingDirection: wd }]}>
              {isFull ? "" : t("room.shareHint")}
            </Text>
          </View>
        ) : null}

        {/* Players list — always visible so people know who's in the room */}
        <View style={styles.playersBlock}>
          <Text style={[styles.label, { color: colors.mutedForeground, writingDirection: wd }]}>
            {t("room.players")}
          </Text>
          <View style={styles.playerList}>
            {state.players.map((p, i) => {
              const isMe = p.name === state.yourName;
              return (
                <View
                  key={`${p.name}-${i}`}
                  style={[
                    styles.playerRow,
                    {
                      backgroundColor: colors.card,
                      borderColor: isMe ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.playerDot,
                      { backgroundColor: p.isHost ? colors.accent : colors.primary },
                    ]}
                  />
                  <Text
                    style={[styles.playerName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {p.name}
                    {isMe ? ` ${t("room.youSuffix")}` : ""}
                  </Text>
                  {p.isHost ? (
                    <View style={[styles.hostBadge, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.hostBadgeText, { color: colors.accentForeground }]}>
                        {t("room.hostLabel")}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {Array.from({ length: Math.max(0, state.maxPlayers - playerCount) }).map(
              (_, i) => (
                <View
                  key={`empty-${i}`}
                  style={[
                    styles.playerRow,
                    styles.playerRowEmpty,
                    { borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.playerDot, { backgroundColor: colors.border }]} />
                  <Text style={[styles.playerName, { color: colors.mutedForeground }]}>
                    {t("room.emptySlot")}
                  </Text>
                </View>
              ),
            )}
          </View>
        </View>

        {/* Lobby → full → host picks digits, others wait */}
        {inLobby && isFull ? (
          state.isHost ? (
            <View style={styles.digitPicker}>
              <Text style={[styles.label, { color: colors.mutedForeground, writingDirection: wd }]}>
                {t("room.pickDigits")}
              </Text>
              <View style={styles.digitRow}>
                {([2, 3, 4] as const).map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => onPickDigits(n)}
                    style={({ pressed }) => [
                      styles.digitCell,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.primary,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    accessibilityLabel={t("diff.label", { n })}
                  >
                    <Text style={[styles.digitNum, { color: colors.primary }]}>
                      {lz(n)}
                    </Text>
                    <Text style={[styles.digitLabel, { color: colors.mutedForeground }]}>
                      {t("room.digitsShort")}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {error ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              ) : null}
            </View>
          ) : (
            <View style={[styles.waitingHost, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="clock" size={18} color={colors.mutedForeground} />
              <Text style={[styles.waitingHostText, { color: colors.foreground, writingDirection: wd }]}>
                {t("room.waitingHost")}
              </Text>
            </View>
          )
        ) : null}

        {/* Playing — own history + keypad */}
        {state.status === "playing" && digits ? (
          <>
            {state.opponents.length > 0 ? (
              <View style={styles.oppRow}>
                {state.opponents.map((o, i) => (
                  <View key={`${o.name}-${i}`} style={[styles.oppChip, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.oppName, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {o.name}
                    </Text>
                    <View style={[styles.oppCount, { backgroundColor: colors.card }]}>
                      <Feather name="hash" size={10} color={colors.mutedForeground} />
                      <Text style={[styles.oppCountText, { color: colors.mutedForeground }]}>
                        {lz(o.guessCount)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.historyWrap}>
              <Text style={[styles.label, { color: colors.mutedForeground, writingDirection: wd }]}>
                {t("room.yourGuesses")}
              </Text>
              <GuessHistory items={historyItems} showCorrectCount={showCount} />
            </View>
            <View style={styles.bottom}>
              <GuessInput value={guessInput} digits={digits} />
              <NumericKeypad
                onDigit={onDigit}
                onBackspace={() => setGuessInput((v) => v.slice(0, -1))}
                onClear={() => setGuessInput("")}
                disabled={locked}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  banner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: "center",
  },
  bannerText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  shareCard: {
    padding: 18, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 10,
  },
  shareLabel: {
    fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold",
  },
  codeText: {
    fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: 8,
  },
  countPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  countPillText: {
    fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.3,
    fontVariant: ["tabular-nums"],
  },
  shareHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  playersBlock: { gap: 8 },
  playerList: { gap: 6 },
  playerRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  playerRowEmpty: { opacity: 0.5, borderStyle: "dashed" },
  playerDot: { width: 8, height: 8, borderRadius: 4 },
  playerName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  hostBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  hostBadgeText: { fontSize: 10, letterSpacing: 0.6, fontFamily: "Inter_700Bold" },
  digitPicker: { gap: 8 },
  digitRow: { flexDirection: "row", gap: 10 },
  digitCell: {
    flex: 1, borderRadius: 16, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
    paddingVertical: 18, gap: 4,
  },
  digitNum: { fontSize: 26, fontFamily: "Inter_700Bold" },
  digitLabel: { fontSize: 10, letterSpacing: 1.2, fontFamily: "Inter_700Bold" },
  errorText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  waitingHost: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1,
  },
  waitingHostText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  oppRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  oppChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    maxWidth: "100%",
  },
  oppName: { fontSize: 12, fontFamily: "Inter_600SemiBold", maxWidth: 100 },
  oppCount: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
  },
  oppCountText: { fontSize: 11, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  label: { fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  historyWrap: { gap: 8 },
  bottom: { gap: 12 },
});
