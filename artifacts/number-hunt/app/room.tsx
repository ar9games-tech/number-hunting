import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { GuessHistory, type HistoryItem } from "@/src/components/GuessHistory";
import { GuessInput } from "@/src/components/GuessInput";
import { NumberDisplay } from "@/src/components/NumberDisplay";
import { NumericKeypad } from "@/src/components/NumericKeypad";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  onUpdate,
  setHidden,
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
  const { t, isRTL } = useT();
  const params = useLocalSearchParams<{ code?: string; role?: string; digits?: string }>();

  const initialRole = (params.role as ViewRole) ?? "host";
  const digits = (Math.min(4, Math.max(2, parseInt(params.digits ?? "3", 10))) || 3) as Digits;

  const [state, setState] = useState<RoomState | null>(null);
  const [hiddenInput, setHiddenInput] = useState("");
  const [guessInput, setGuessInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    const incomingCode = (params.code ?? "").toUpperCase();

    (async () => {
      try {
        if (initialRole === "host") {
          const existing = incomingCode ? await getRoom(incomingCode) : null;
          if (cancelled) return;
          if (existing) {
            setState(existing);
          } else {
            const room = await createRoom(
              digits,
              settings.playerName || t("misc.player1"),
            );
            if (cancelled) return;
            setState(room);
          }
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

  useEffect(() => {
    if (!state?.code) return;
    const unsub = onUpdate(state.code, (s) => setState(s));
    return unsub;
  }, [state?.code]);

  useEffect(() => {
    if (state?.status === "won") {
      const winnerName = state.winner === "host" ? state.hostName : state.guestName;
      router.replace({
        pathname: "/result",
        params: {
          mode: "online",
          digits: String(state.digits),
          guesses: String(state.history.length),
          won: "1",
          winnerName,
          code: state.code,
          hidden: state.hidden ?? "",
        },
      });
    }
  }, [state?.status]);

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

  const guesserItems: HistoryItem[] = state.history.map((h) => ({
    guess: h.guess,
    feedback: h.feedback,
    by: h.by === "host" ? state.hostName : state.guestName,
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
        <View style={[styles.simBanner, { backgroundColor: colors.secondary }]}>
          <Feather name="info" size={14} color={colors.secondaryForeground} />
          <Text
            style={[styles.simText, { color: colors.secondaryForeground, writingDirection: wd }]}
          >
            {t("room.simBanner")}
          </Text>
        </View>

        <View style={[styles.roleChip, { backgroundColor: colors.muted }]}>
          <Text style={[styles.roleText, { color: colors.mutedForeground }]}>
            {t(initialRole === "host" ? "room.host" : "room.guest", {
              name: initialRole === "host" ? state.hostName : state.guestName,
            })}
          </Text>
        </View>

        {initialRole === "host" ? (
          <HostView
            state={state}
            digits={digits}
            hiddenInput={hiddenInput}
            setHiddenInput={setHiddenInput}
            allowLeadingZero={settings.allowLeadingZero}
            history={guesserItems}
            showCount={showCount}
          />
        ) : (
          <GuestView
            state={state}
            digits={digits}
            guessInput={guessInput}
            setGuessInput={setGuessInput}
            history={guesserItems}
            showCount={showCount}
          />
        )}
      </View>
    </View>
  );
}

function HostView({
  state, digits, hiddenInput, setHiddenInput, allowLeadingZero, history, showCount,
}: {
  state: RoomState; digits: Digits;
  hiddenInput: string; setHiddenInput: (v: string) => void;
  allowLeadingZero: boolean;
  history: HistoryItem[]; showCount: boolean;
}) {
  const colors = useColors();
  const { t } = useT();
  const valid = useMemo(() => {
    if (hiddenInput.length !== digits) return false;
    if (!/^[0-9]+$/.test(hiddenInput)) return false;
    if (!allowLeadingZero && hiddenInput.startsWith("0")) return false;
    return true;
  }, [hiddenInput, digits, allowLeadingZero]);

  if (state.status === "setup") {
    return (
      <View style={styles.flex}>
        <View style={styles.top}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {t("room.setHidden")}
          </Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {allowLeadingZero
              ? t("room.digitsHint", { n: digits })
              : t("room.digitsHintLZ", { n: digits })}
          </Text>
          <View style={{ marginTop: 8 }}>
            <GuessInput value={hiddenInput} digits={digits} />
          </View>
        </View>
        <View style={styles.bottom}>
          <NumericKeypad
            onDigit={(d) =>
              setHiddenInput(hiddenInput.length < digits ? hiddenInput + d : hiddenInput)
            }
            onBackspace={() => setHiddenInput(hiddenInput.slice(0, -1))}
            onSubmit={() => {
              if (valid) {
                setHidden(state.code, hiddenInput);
                setHiddenInput("");
              }
            }}
            canSubmit={valid}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {t("room.yourHidden")}
        </Text>
        <NumberDisplay digits={digits} reveal={state.hidden} />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {t("room.waitingForGuesser")}
        </Text>
      </View>
      <View style={styles.historyWrap}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {t("room.guesses")}
        </Text>
        <GuessHistory items={history} showCorrectCount={showCount} />
      </View>
    </View>
  );
}

function GuestView({
  state, digits, guessInput, setGuessInput, history, showCount,
}: {
  state: RoomState; digits: Digits;
  guessInput: string; setGuessInput: (v: string) => void;
  history: HistoryItem[]; showCount: boolean;
}) {
  const colors = useColors();
  const { t } = useT();

  if (state.status === "setup") {
    return (
      <View style={[styles.flex, styles.center]}>
        <Feather name="clock" size={32} color={colors.mutedForeground} />
        <Text style={[styles.waitTitle, { color: colors.foreground }]}>
          {t("room.waitingFor", { name: state.hostName })}
        </Text>
        <Text style={[styles.waitSub, { color: colors.mutedForeground }]}>
          {t("room.picking", { n: digits })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {t("solo.hidden")}
        </Text>
        <NumberDisplay digits={digits} reveal={state.status === "won" ? state.hidden : null} />
      </View>
      <View style={styles.historyWrap}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {t("room.history")}
        </Text>
        <GuessHistory items={history} showCorrectCount={showCount} />
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
              submitGuess(state.code, "guest", guessInput);
              setGuessInput("");
            }
          }}
          canSubmit={isValidGuess(guessInput, digits)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, gap: 12 },
  flex: { flex: 1, gap: 16 },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  simBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: "center",
  },
  simText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  roleChip: {
    alignSelf: "center", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
  },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  top: { alignItems: "center", gap: 10, paddingTop: 4 },
  label: { fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  historyWrap: { flex: 1, gap: 8 },
  bottom: { gap: 12 },
  waitTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  waitSub: {
    fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24,
  },
});
