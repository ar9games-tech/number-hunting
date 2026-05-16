import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { GuessHistory, type HistoryItem } from "@/src/components/GuessHistory";
import { GuessInput } from "@/src/components/GuessInput";
import { NumberDisplay } from "@/src/components/NumberDisplay";
import { NumericKeypad } from "@/src/components/NumericKeypad";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  onUpdate,
  setHidden,
  submitGuess,
  switchRoles,
  type RoomState,
} from "@/src/net/socketPlaceholder";
import { webBottomInset } from "@/src/theme/theme";
import { isValidGuess, type Digits } from "@/src/utils/gameLogic";

type ViewRole = "host" | "guest";

export default function RoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const params = useLocalSearchParams<{ code?: string; role?: string; digits?: string }>();

  const initialRole = (params.role as ViewRole) ?? "host";
  const digits = (Math.min(4, Math.max(2, parseInt(params.digits ?? "3", 10))) || 3) as Digits;

  const [activeView, setActiveView] = useState<ViewRole>(initialRole);
  const [state, setState] = useState<RoomState | null>(null);
  const [hiddenInput, setHiddenInput] = useState("");
  const [guessInput, setGuessInput] = useState("");

  // Initialize room
  useEffect(() => {
    const incomingCode = (params.code ?? "").toUpperCase();
    if (initialRole === "host") {
      // If a code was passed (e.g. after switchRoles), reuse the existing room.
      const existing = incomingCode ? getRoom(incomingCode) : null;
      if (existing) {
        setState(existing);
      } else {
        const room = createRoom(digits, settings.playerName || "Player 1");
        // Auto-mark guest joined for local simulation, with default name
        joinRoom(room.code, "Player 2");
        setState(room);
      }
    } else {
      const room = joinRoom(incomingCode, settings.playerName || "Player 2");
      if (!room) {
        Alert.alert("Room not found", "Returning to lobby.");
        router.replace("/lobby");
        return;
      }
      setState(room);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to updates
  useEffect(() => {
    if (!state?.code) return;
    const unsub = onUpdate(state.code, (s) => setState(s));
    return unsub;
  }, [state?.code]);

  // Handle win → result screen
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

  if (!state) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Room" />
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
        title={`Room ${state.code}`}
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
          <Text style={[styles.simText, { color: colors.secondaryForeground }]}>
            Local simulation — switch views to play both roles
          </Text>
        </View>

        <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
          {(["host", "guest"] as const).map((r) => {
            const active = r === activeView;
            return (
              <Pressable
                key={r}
                onPress={() => setActiveView(r)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? colors.card : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: active ? colors.foreground : colors.mutedForeground,
                    },
                  ]}
                >
                  {r === "host" ? `${state.hostName} (host)` : `${state.guestName} (guest)`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {activeView === "host" ? (
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
  state,
  digits,
  hiddenInput,
  setHiddenInput,
  allowLeadingZero,
  history,
  showCount,
}: {
  state: RoomState;
  digits: Digits;
  hiddenInput: string;
  setHiddenInput: (v: string) => void;
  allowLeadingZero: boolean;
  history: HistoryItem[];
  showCount: boolean;
}) {
  const colors = useColors();
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
          <Text style={[styles.label, { color: colors.mutedForeground }]}>SET A HIDDEN NUMBER</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {digits} digits{!allowLeadingZero ? " · no leading zero" : ""}
          </Text>
          <View style={{ marginTop: 8 }}>
            <GuessInput value={hiddenInput} digits={digits} />
          </View>
        </View>
        <View style={styles.bottom}>
          <NumericKeypad
            onDigit={(d) => setHiddenInput(hiddenInput.length < digits ? hiddenInput + d : hiddenInput)}
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

  // Guessing or won — host watches
  return (
    <View style={styles.flex}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>YOUR HIDDEN NUMBER</Text>
        <NumberDisplay digits={digits} reveal={state.hidden} />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Waiting for the guesser…
        </Text>
      </View>
      <View style={styles.historyWrap}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>GUESSES</Text>
        <GuessHistory items={history} showCorrectCount={showCount} />
      </View>
    </View>
  );
}

function GuestView({
  state,
  digits,
  guessInput,
  setGuessInput,
  history,
  showCount,
}: {
  state: RoomState;
  digits: Digits;
  guessInput: string;
  setGuessInput: (v: string) => void;
  history: HistoryItem[];
  showCount: boolean;
}) {
  const colors = useColors();

  if (state.status === "setup") {
    return (
      <View style={[styles.flex, styles.center]}>
        <Feather name="clock" size={32} color={colors.mutedForeground} />
        <Text style={[styles.waitTitle, { color: colors.foreground }]}>
          Waiting for {state.hostName}
        </Text>
        <Text style={[styles.waitSub, { color: colors.mutedForeground }]}>
          They are picking a hidden {digits}-digit number.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>HIDDEN NUMBER</Text>
        <NumberDisplay digits={digits} reveal={state.status === "won" ? state.hidden : null} />
      </View>
      <View style={styles.historyWrap}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>HISTORY</Text>
        <GuessHistory items={history} showCorrectCount={showCount} />
      </View>
      <View style={styles.bottom}>
        <GuessInput value={guessInput} digits={digits} />
        <NumericKeypad
          onDigit={(d) => setGuessInput(guessInput.length < digits ? guessInput + d : guessInput)}
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

// Exported helper kept for reference; switching is handled from the result screen.
export function _switchRolesFromResult(code: string) {
  switchRoles(code);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  flex: { flex: 1, gap: 16 },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  simBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "center",
  },
  simText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  tabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  top: {
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Inter_600SemiBold",
  },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  historyWrap: {
    flex: 1,
    gap: 8,
  },
  bottom: {
    gap: 12,
  },
  waitTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  waitSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
