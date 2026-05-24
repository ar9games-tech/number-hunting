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
  onReactionReceived,
  onRoomClosed,
  onTurnError,
  onUpdate,
  type ReactionEvent,
  sendReaction,
  setRoomDigits,
  submitGuess as sendGuess,
  type RoomState,
} from "@/src/net/socketPlaceholder";
import { FloatingReaction } from "@/src/components/FloatingReaction";
import { ReactionsButton } from "@/src/components/ReactionsButton";
import { ReactionsPanel } from "@/src/components/ReactionsPanel";
import {
  REACTION_COOLDOWN_MS,
  REACTION_MAX_STACK,
} from "@/src/services/reactionManager";
import { setGameplayActive } from "@/src/services/ads";
import { playGameStart, playPlayerJoined, playReactionPop } from "@/src/services/soundManager";
import { formatPlayerIdentity } from "@/src/storage/storage";
import { tapHaptic } from "@/src/utils/sound";
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

  const [stateRaw, setStateRaw] = useState<RoomState | null>(null);
  // Mirror of the latest `state` for use inside deferred callbacks
  // (e.g. the auto-submit timer). Reading from a ref at fire time
  // prevents a stale render closure from sending a guess after the
  // server has already rotated the turn away from us. The ref is
  // updated *synchronously* at ingest time (inside `setState`) — using
  // a passive useEffect would leave a window between setStateRaw and
  // effect flush during which the timer could still read stale state.
  const stateRef = useRef<RoomState | null>(null);
  const state = stateRaw;
  const setState = (next: RoomState | null) => {
    stateRef.current = next;
    setStateRaw(next);
  };
  const [guessInput, setGuessInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  // Handle for the 130ms auto-submit timer so it can be cancelled the
  // moment the turn rotates away from us — otherwise a full buffered
  // guess could still fire after isMyTurn flips to false.
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // --- Reactions ----------------------------------------------------------
  // Active floating reactions stacked above the keypad. Each entry has a
  // monotonically-increasing local key so React's diffing doesn't reuse
  // an animated row when an identical reaction lands twice in a row.
  type ActiveReaction = ReactionEvent & { key: number };
  const [activeReactions, setActiveReactions] = useState<ActiveReaction[]>([]);
  const reactionKeyRef = useRef(0);
  const [panelOpen, setPanelOpen] = useState(false);
  // Cooldown is wall-clock based — survives panel open/close and React
  // re-renders. The boolean UI flag is just an animation trigger.
  const lastSentAtRef = useRef(0);
  const [cooling, setCooling] = useState(false);
  const coolTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Suppress all ads (banner / interstitial / rewarded) for the entire
  // lifetime of an online match — see `src/services/ads.ts` for the gate.
  // Cleared on unmount, including navigation to the result screen.
  useEffect(() => {
    setGameplayActive(true);
    return () => {
      setGameplayActive(false);
    };
  }, []);

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

  // Track round start / end for the online timer. Also fires the
  // game-start sound exactly once per round — the same edge that
  // resets the timer is the canonical "the match just kicked off"
  // moment, which keeps the cue in sync with the gameplay change
  // regardless of how we got into "playing" (host pick, random match).
  useEffect(() => {
    if (state?.status === "playing" && roundStartedAtRef.current == null) {
      roundStartedAtRef.current = Date.now();
      roundElapsedSecRef.current = 0;
      playGameStart(settings.soundOn);
    }
    if (state?.status !== "playing" && state?.status !== "won") {
      // Reset between rounds (e.g. rematch back to waiting).
      roundStartedAtRef.current = null;
      roundElapsedSecRef.current = 0;
    }
  }, [state?.status, settings.soundOn]);

  // Opponent-joined cue: ring softly the first time a new peer appears
  // in the room while we're still in the waiting lobby. We compare the
  // current and previous player counts so the sound fires only on the
  // join edge, not on every re-render of the same state.
  const lastPlayerCountRef = useRef<number | null>(null);
  useEffect(() => {
    const count = state?.players.length ?? 0;
    const prev = lastPlayerCountRef.current;
    if (
      prev != null &&
      count > prev &&
      state?.status === "waiting"
    ) {
      playPlayerJoined(settings.soundOn);
    }
    lastPlayerCountRef.current = count;
  }, [state?.players.length, state?.status, settings.soundOn]);

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

  // Turn-based gameplay: the server picks the active player and rotates
  // after every non-winning guess. The keypad + auto-submit are both
  // gated on this — clients can never send a guess out of turn, and the
  // server independently rejects any that slip through.
  const youAreEliminated = !!state?.youAreEliminated;
  const isMyTurn =
    !!state &&
    state.status === "playing" &&
    !!state.currentTurnId &&
    state.currentTurnId === state.yourId &&
    !youAreEliminated;
  const currentTurnName = state?.currentTurnName ?? null;
  const currentTurnIsMe = isMyTurn;

  const submitNow = (rawGuess: string) => {
    if (submittingRef.current) return;
    // Read from the ref, not the render closure — this function is
    // called from a setTimeout, and by the time it fires the turn may
    // already have rotated to another player. Closure-state would
    // still say "my turn" and let the guess go out.
    const cur = stateRef.current;
    if (!cur || cur.status !== "playing" || !cur.digits) return;
    // Hard turn gate against the latest server-confirmed state.
    if (cur.currentTurnId !== cur.yourId) return;
    // Normalise Arabic digits → English before validating or sending.
    const guess = normalizeDigits(rawGuess);
    if (!guess || !isValidGuess(guess, cur.digits)) return;
    submittingRef.current = true;
    setLocked(true);
    // Expect the server to grow our history by exactly one entry. The
    // ack-watcher effect (below) releases the lock the moment that lands.
    pendingHistoryLenRef.current = cur.yourHistory.length + 1;
    try {
      sendGuess(cur.code, guess);
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

  const cancelPendingAutoSubmit = () => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
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
      if (coolTimerRef.current) clearTimeout(coolTimerRef.current);
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    };
  }, []);

  // Subscribe to turn-rejection events. The server only emits these
  // when a client somehow submits out of turn (e.g. a buffered guess
  // landing right after the turn rotated). Clear any half-typed input
  // so the previous turn's keystrokes don't replay into the new one,
  // and surface a brief banner so the player understands the rejection.
  const [turnNotice, setTurnNotice] = useState<string | null>(null);
  const turnNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state?.code) return;
    const unsub = onTurnError(state.code, (evt) => {
      releaseLock();
      cancelPendingAutoSubmit();
      setGuessInput("");
      // Always show the explicit "Wait for your turn" wording per spec
      // (EN/AR). Append the active player's name when known so the user
      // sees both the rule and who they're waiting on.
      const base = t("room.notYourTurn");
      const msg = evt.currentTurnName
        ? `${base} — ${t("room.playersTurn", { name: evt.currentTurnName })}`
        : base;
      setTurnNotice(msg);
      if (turnNoticeTimerRef.current) clearTimeout(turnNoticeTimerRef.current);
      turnNoticeTimerRef.current = setTimeout(() => setTurnNotice(null), 2500);
    });
    return () => {
      unsub();
      if (turnNoticeTimerRef.current) {
        clearTimeout(turnNoticeTimerRef.current);
        turnNoticeTimerRef.current = null;
      }
    };
  }, [state?.code, t]);

  // Whenever the turn flips away from us, drop any half-typed digits
  // AND cancel any pending auto-submit timer. Without the cancel a full
  // buffered guess (already at `digits` length, waiting out the 130ms
  // settle delay) would still fire after the turn rotated — violating
  // the spec and forcing a server-side `turnError`.
  useEffect(() => {
    if (!currentTurnIsMe) {
      cancelPendingAutoSubmit();
      setGuessInput("");
    }
  }, [currentTurnIsMe]);

  // Subscribe to incoming reactions for this room. Scoped to the
  // playing phase only so lobby/won UI never plays a pop or shows a
  // float. Also gated by the user's "Enable reactions" setting.
  const code = state?.code;
  const reactionsActive =
    !!code && state?.status === "playing" && settings.enableReactions;
  useEffect(() => {
    if (!reactionsActive || !code) {
      // Drop any leftover floats when leaving the playing phase so they
      // don't reappear if the player rematches and re-enters.
      if (!reactionsActive) setActiveReactions([]);
      return;
    }
    const unsub = onReactionReceived(code, (evt) => {
      reactionKeyRef.current += 1;
      const entry: ActiveReaction = { ...evt, key: reactionKeyRef.current };
      setActiveReactions((prev) => {
        // Cap the stack so a flood from one peer never floods the UI.
        const next = [...prev, entry];
        return next.length > REACTION_MAX_STACK
          ? next.slice(next.length - REACTION_MAX_STACK)
          : next;
      });
      // Audio + haptic placeholders (no shipped asset → no-op for sound).
      playReactionPop(settings.soundOn);
      tapHaptic(settings.hapticsOn);
    });
    return () => {
      unsub();
    };
  }, [code, reactionsActive, settings.soundOn, settings.hapticsOn]);

  const onPickReaction = (reaction: string) => {
    if (!state) return;
    const now = Date.now();
    if (now - lastSentAtRef.current < REACTION_COOLDOWN_MS) return;
    lastSentAtRef.current = now;
    setCooling(true);
    if (coolTimerRef.current) clearTimeout(coolTimerRef.current);
    coolTimerRef.current = setTimeout(() => {
      setCooling(false);
      coolTimerRef.current = null;
    }, REACTION_COOLDOWN_MS);
    try {
      sendReaction(state.code, reaction);
    } catch {
      // Ignore — failed sends just don't broadcast; the cooldown still
      // applies as a UX nicety against rapid retry-spam.
    }
  };

  const onDigit = (d: string) => {
    if (submittingRef.current) return;
    if (!state || state.status !== "playing" || !digits) return;
    // Eliminated players are spectators — keypad is dead even when the
    // server would otherwise have them in the rotation (defensive: the
    // server already skips them).
    if (state.youAreEliminated) return;
    // Turn gate — don't even buffer keystrokes when it isn't our turn,
    // so a player can never queue up a guess for the moment their turn
    // comes around.
    if (state.currentTurnId !== state.yourId) return;
    setGuessInput((v) => {
      if (v.length >= digits) return v;
      const next = v + d;
      if (next.length === digits) {
        // Track the timer handle so the turn-rotation effect below can
        // cancel it if the turn flips away from us in the meantime.
        cancelPendingAutoSubmit();
        autoSubmitTimerRef.current = setTimeout(() => {
          autoSubmitTimerRef.current = null;
          submitNow(next);
        }, AUTO_SUBMIT_DELAY_MS);
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
  const isPlaying = state.status === "playing" && !!digits;

  const header = (
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
  );

  // Playing view uses a FIXED layout so the numeric keypad stays pinned
  // to the bottom no matter how many guesses pile up — guess history
  // scrolls independently in the flex:1 middle slot. The lobby/waiting
  // view keeps its old ScrollView since it's content-heavy but never
  // shows the keypad.
  if (isPlaying && digits) {
    const turnBannerText = currentTurnIsMe
      ? t("room.yourTurn")
      : currentTurnName
        ? t("room.playersTurn", { name: currentTurnName })
        : t("room.waitingTurn");
    const turnBannerBg = currentTurnIsMe ? colors.primary : colors.muted;
    const turnBannerFg = currentTurnIsMe
      ? colors.primaryForeground
      : colors.mutedForeground;
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        <View style={[styles.playingContainer, { paddingBottom: bottomPad }]}>
          {/* Turn banner — primary color when it's the viewer's turn, a
              muted "waiting" pill otherwise. Drives the player's whole
              sense of "can I act right now?" so it sits above the
              opponents row and is always visible during play. */}
          <View
            style={[
              styles.turnBanner,
              { backgroundColor: turnBannerBg },
            ]}
          >
            <Feather
              name={currentTurnIsMe ? "play-circle" : "clock"}
              size={14}
              color={turnBannerFg}
            />
            <Text
              style={[
                styles.turnBannerText,
                { color: turnBannerFg, writingDirection: wd },
              ]}
              numberOfLines={1}
            >
              {turnBannerText}
            </Text>
          </View>

          {/* Spectator banner — eliminated players keep their socket
              attached so they can still react and watch the live
              guesses, but the keypad + auto-submit are dead for them. */}
          {youAreEliminated ? (
            <View
              style={[
                styles.spectatorBanner,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Feather name="eye" size={14} color={colors.mutedForeground} />
              <Text
                style={[
                  styles.spectatorText,
                  { color: colors.mutedForeground, writingDirection: wd },
                ]}
                numberOfLines={1}
              >
                {t("spectator.banner")}
              </Text>
            </View>
          ) : null}

          {/* Transient rejection notice (server said "not your turn"). */}
          {turnNotice ? (
            <Text
              style={[
                styles.turnNotice,
                { color: colors.destructive, writingDirection: wd },
              ]}
            >
              {turnNotice}
            </Text>
          ) : null}

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

          <View style={styles.historyWrapPlaying}>
            <Text style={[styles.label, { color: colors.mutedForeground, writingDirection: wd }]}>
              {t("room.yourGuesses")}
            </Text>
            {/* GuessHistory uses an internal ScrollView with flex:1, so
                new guesses scroll inside this slot instead of pushing
                the keypad down. */}
            <GuessHistory items={historyItems} showCorrectCount={showCount} />
          </View>

          <View style={styles.bottom}>
            <GuessInput value={guessInput} digits={digits} />
            <NumericKeypad
              onDigit={onDigit}
              onBackspace={() => setGuessInput((v) => v.slice(0, -1))}
              onClear={() => setGuessInput("")}
              disabled={locked || !currentTurnIsMe}
            />
          </View>

          {/* Reactions overlay — absolutely positioned so it never
              affects the keypad/history layout.
              - The button sits at the TOP corner (start side under
                RTL, end side under LTR), just below the header. It is
                deliberately *not* near the keypad anymore — the prior
                bottom-anchored placement overlapped the keypad and
                guess input on short screens.
              - The floating reaction stack (transient incoming
                reactions) is anchored to the upper-middle area so
                pop-ups never cover the keypad area either.
              `pointerEvents` keeps unrelated taps falling through to
              the underlying gameplay. */}
          {settings.enableReactions ? (
            <>
              <View
                style={styles.reactionStack}
                pointerEvents="none"
              >
                {activeReactions.map((r) => (
                  <FloatingReaction
                    key={r.key}
                    name={r.name}
                    reaction={r.reaction}
                    isRTL={isRTL}
                    onDone={() => {
                      setActiveReactions((prev) =>
                        prev.filter((p) => p.key !== r.key),
                      );
                    }}
                  />
                ))}
              </View>
              <View
                style={[
                  styles.reactionButtonWrap,
                  isRTL ? { left: 14 } : { right: 14 },
                ]}
                pointerEvents="box-none"
              >
                <ReactionsButton
                  onPress={() => setPanelOpen(true)}
                  cooling={cooling}
                  label={t("reactions.openLabel")}
                />
              </View>
              <ReactionsPanel
                visible={panelOpen}
                onClose={() => setPanelOpen(false)}
                onPick={onPickReaction}
                language={settings.language}
                title={t("reactions.panelTitle")}
                emojiLabel={t("reactions.emojiSection")}
                textLabel={t("reactions.textSection")}
              />
            </>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
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
                    accessibilityLabel={t(
                      `diff.label${n}` as "diff.label2" | "diff.label3" | "diff.label4",
                    )}
                  >
                    {/* Online/host digit picker shows ONLY the numeral —
                        no "Digits" / "خانات" label, per spec. The
                        accessibility label still carries the full
                        descriptive form for screen readers. */}
                    <Text style={[styles.digitNum, { color: colors.primary }]}>
                      {lz(n)}
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

        {/* The playing view is rendered separately above (fixed layout
            with pinned keypad); this ScrollView only covers the
            lobby/waiting flow. */}
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
  // Reserve a 60px gutter on the end so opponent chips can never run
  // under the floating Reactions button (48px wide + 14px inset). The
  // gutter sits on the *visual* end side; RN flips paddingEnd
  // automatically in RTL so the button-side stays clear in both
  // English (top-right) and Arabic (top-left).
  oppRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    paddingEnd: 60,
    minHeight: 48,
  },
  turnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "center",
    maxWidth: "85%",
  },
  turnBannerText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  turnNotice: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginTop: -4,
  },
  spectatorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "center",
  },
  spectatorText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
  // Playing screen layout: container takes all space below the header,
  // history slot flexes to fill remaining room (and scrolls internally),
  // keypad bottom stays a fixed-height row that never shifts.
  playingContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  historyWrapPlaying: { flex: 1, gap: 8, minHeight: 0 },
  bottom: { gap: 12 },
  // Transient incoming-reaction popups — anchored to the upper-middle
  // of the playing area so they never overlap the keypad or guess
  // input. They animate out via FloatingReaction's own lifecycle.
  reactionStack: {
    position: "absolute",
    top: 64,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  // The Reactions button sits at the top corner of the playing
  // container (just below the header), opposite the leave button.
  // Absolute + top offset keeps it far from the keypad on every
  // screen size; the side (left/right) is set inline per direction.
  reactionButtonWrap: {
    position: "absolute",
    top: 4,
  },
});
