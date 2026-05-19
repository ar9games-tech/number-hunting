import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { AchievementBanner } from "@/src/components/AchievementBanner";
import { Button } from "@/src/components/Button";
import { GlassCard } from "@/src/components/GlassCard";
import { NumberDisplay } from "@/src/components/NumberDisplay";
import { ParticleBurst } from "@/src/components/ParticleBurst";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import { PunishmentButton } from "@/src/components/PunishmentButton";
import { PunishmentCardModal } from "@/src/components/PunishmentCardModal";
import { useT } from "@/src/i18n/useT";
import {
  getCachedRoom,
  leaveRoom,
  onPunishmentError,
  onPunishmentResolved,
  onPunishmentRevealed,
  onPunishmentTargetChanged,
  redirectPunishmentTarget,
  requestPunishmentCard,
  requestRematch,
  respondPunishment,
  type PunishmentResolved,
  type PunishmentReveal,
  type PunishmentTargetChanged,
} from "@/src/net/socketPlaceholder";
import {
  playNewMatch,
  playPunishmentAccept,
  playPunishmentPackOpen,
  playPunishmentRefuse,
  playPunishmentReveal,
} from "@/src/services/soundManager";
import {
  clearPendingRandomMatch,
  consumePendingRandomMatch,
  consumePendingUnlocks,
  recordLoss,
  recordPunishmentGiven,
  recordPunishmentReceived,
  recordWin,
  saveRecordIfBest,
} from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";
import { errorHaptic, playLose, playWin, successHaptic } from "@/src/utils/sound";
import type { Digits } from "@/src/utils/gameLogic";
import { formatTime } from "@/src/utils/scoring";

export default function ResultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { t, lz } = useT();
  const params = useLocalSearchParams<{
    mode?: string;
    digits?: string;
    timeSec?: string;
    guesses?: string;
    isNewRecord?: string;
    won?: string;
    winnerName?: string;
    code?: string;
    hidden?: string;
    role?: string;
    /** Comma-joined achievement IDs unlocked by the just-finished solo game. */
    unlocks?: string;
  }>();

  const mode = params.mode ?? "solo";
  const digits = parseInt(params.digits ?? "3", 10);
  const timeSec = parseInt(params.timeSec ?? "0", 10);
  const guesses = parseInt(params.guesses ?? "0", 10);
  const [isNewRecord, setIsNewRecord] = React.useState<boolean>(params.isNewRecord === "1");
  const isOnline = mode === "online";
  const hidden = params.hidden ?? "";
  const code = params.code ?? "";
  const youWon = params.won === "1";
  // Solo always shows the "you won" card (solo can't lose). Online uses
  // `youWon` from params.
  const showVictory = isOnline ? youWon : true;
  const tone = showVictory ? colors.success : colors.destructive;

  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(20)).current;
  const burst = useRef(new Animated.Value(0)).current;
  // Particle burst only renders on victory. Driven by a boolean toggled
  // shortly after mount so the explosion lines up with the card landing.
  const [showParticles, setShowParticles] = React.useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 8 }),
    ]).start();
    if (isNewRecord) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(burst, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(burst, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    }
    if (showVictory) {
      const id = setTimeout(() => setShowParticles(true), 150);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [fade, lift, burst, isNewRecord, showVictory]);

  // Solo unlocks are computed in solo.tsx and arrive via params. Online
  // unlocks are computed here when we record the win. Defensive dedupe
  // in case the param ever round-trips with duplicates (e.g. rematch
  // navigation reusing the param).
  const [unlocks, setUnlocks] = React.useState<string[]>(() =>
    Array.from(new Set((params.unlocks ?? "").split(",").filter(Boolean))),
  );

  // Outcome side-effects: lifetime stats + sound + haptic. Runs once per
  // mount, only for online (solo already persisted in the solo screen so we
  // don't double-count).
  // Punishment state. The winner picks a target → server broadcasts the
  // reveal → only the target's device can Accept/Refuse → server
  // broadcasts the resolution to everyone.
  const [punishment, setPunishment] = React.useState<PunishmentReveal | null>(null);
  const [punishmentResolved, setPunishmentResolved] = React.useState<PunishmentResolved | null>(null);
  const [punishmentVisible, setPunishmentVisible] = React.useState(false);
  const [punishmentUsed, setPunishmentUsed] = React.useState(false);
  const [punishmentLoading, setPunishmentLoading] = React.useState(false);
  const [punishmentError, setPunishmentError] = React.useState<string | null>(null);
  const [targetPickerVisible, setTargetPickerVisible] = React.useState(false);
  // Separate picker state for the chooseAnother "pass" flow — opened by
  // the target from inside the reveal modal, not by the winner.
  const [reassignPickerVisible, setReassignPickerVisible] = React.useState(false);
  // When the chooseAnother chain is mid-redirect: the card has been
  // cleared on the server and we're waiting for the redirector (the
  // original target) to tap Punishment again. The new target has
  // already been picked. Cleared when the second reveal lands or on
  // rematch/leave.
  const [redirect, setRedirect] = React.useState<PunishmentTargetChanged | null>(null);

  // Pull the live room snapshot so we know our own stable id and the
  // opponent list. We identify the target by id, not name, because
  // display names aren't guaranteed unique within a room.
  const cachedRoom = isOnline && code ? getCachedRoom(code) : null;
  const yourId = cachedRoom?.yourId ?? "";
  const winnerId = cachedRoom?.winnerId ?? "";
  const opponents = React.useMemo(
    () =>
      (cachedRoom?.players ?? []).filter((p) => p.id && p.id !== yourId),
    [cachedRoom?.players, yourId],
  );
  // For the chooseAnother pass: exclude both yourself (the current
  // target) and the winner so the punishment never bounces back to the
  // person who drew the card. Server enforces the same rule.
  const reassignCandidates = React.useMemo(
    () =>
      (cachedRoom?.players ?? []).filter(
        (p) => p.id && p.id !== yourId && p.id !== winnerId,
      ),
    [cachedRoom?.players, yourId, winnerId],
  );
  const youAreTarget = !!punishment && !!yourId && punishment.targetId === yourId;

  useEffect(() => {
    if (!isOnline || !code) return;
    const unsubReveal = onPunishmentRevealed(code, (reveal) => {
      if (__DEV__) {
        console.log("[punishment] modal opened", {
          cardId: reveal.cardId,
          targetName: reveal.targetName,
        });
      }
      setPunishment(reveal);
      setPunishmentResolved(null);
      setPunishmentVisible(true);
      setPunishmentUsed(true);
      setPunishmentLoading(false);
      setPunishmentError(null);
      setTargetPickerVisible(false);
      // A reveal also lands when the server reassigns (chooseAnother
      // pass) — close any stale picker so the new target sees a clean
      // reveal animation instead of two overlapping modals.
      setReassignPickerVisible(false);
      // The chain's second reveal closes the redirect waiting state.
      setRedirect(null);
      // Two distinct cues: the "pack opening" rumble plays as the
      // sealed pack appears, and the reveal sting hits when the card
      // slides out. Both are gated by the central soundOn setting.
      playPunishmentPackOpen(settings.soundOn);
      playPunishmentReveal(settings.soundOn);
    });
    const unsubRedirect = onPunishmentTargetChanged(code, (evt) => {
      if (__DEV__) {
        console.log("[punishment] target changed (redirect started)", {
          redirectedByName: evt.redirectedByName,
          targetName: evt.targetName,
        });
      }
      // Close the old chooseAnother modal everywhere and clear the
      // stale reveal so peers don't see the previous card under the
      // waiting UI. The redirector will see a "Draw new card" button;
      // everyone else sees a waiting message.
      setPunishmentVisible(false);
      setPunishment(null);
      setPunishmentResolved(null);
      setReassignPickerVisible(false);
      setPunishmentLoading(false);
      setPunishmentError(null);
      setRedirect(evt);
    });
    const unsubResolved = onPunishmentResolved(code, (resolved) => {
      if (__DEV__) {
        console.log("[punishment] resolution received", {
          accepted: resolved.accepted,
          targetName: resolved.targetName,
        });
      }
      setPunishmentResolved(resolved);
      // Server-confirmed punishment trigger. We only credit achievements
      // on resolution (not on intent/reveal) so the descriptions match
      // what actually happened: the winner who drew the card gets the
      // "given" credit, and only the final resolving target — after any
      // chooseAnother reassignment — gets the "received" credit.
      if (yourId && winnerId === yourId) {
        void recordPunishmentGiven()
          .then((r) => {
            if (r.newUnlocks.length > 0) {
              setUnlocks((prev) =>
                Array.from(new Set([...prev, ...r.newUnlocks])),
              );
            }
          })
          .catch(() => {});
      }
      if (yourId && resolved.targetId === yourId) {
        void recordPunishmentReceived()
          .then((r) => {
            if (r.newUnlocks.length > 0) {
              setUnlocks((prev) =>
                Array.from(new Set([...prev, ...r.newUnlocks])),
              );
            }
          })
          .catch(() => {});
      }
    });
    const unsubErr = onPunishmentError(code, (reason) => {
      setPunishmentLoading(false);
      if (reason === "alreadyUsed") {
        setPunishmentUsed(true);
        return;
      }
      // Surface friendly copy for the rare cases the request shouldn't
      // have been allowed (e.g. status drifted just before it landed).
      const body =
        reason === "notWinner"
          ? t("punishment.notWinnerBody")
          : reason === "notWon"
            ? t("punishment.notWonBody")
            : reason === "noTarget" || reason === "invalidTarget"
              ? t("punishment.invalidTargetBody")
              : t("punishment.errorTitle");
      setPunishmentError(body);
    });
    return () => {
      unsubReveal();
      unsubRedirect();
      unsubResolved();
      unsubErr();
    };
  }, [isOnline, code, settings.soundOn, t]);

  // Auto-dismiss the soft error after a short delay so it doesn't linger.
  useEffect(() => {
    if (!punishmentError) return;
    const id = setTimeout(() => setPunishmentError(null), 3500);
    return () => clearTimeout(id);
  }, [punishmentError]);

  const persistedRef = useRef(false);
  useEffect(() => {
    if (persistedRef.current) return;
    persistedRef.current = true;

    if (isOnline) {
      if (youWon) {
        const d = (Math.min(4, Math.max(2, digits)) || 3) as Digits;
        // Save online win: lifetime stats + the per-digit best time.
        // We only save the time record on a WIN, never on a loss.
        // Consume the random-match flag before persisting so the win is
        // attributed correctly to the random-match queue. opponentCount
        // is captured from the room snapshot (excludes self).
        void (async () => {
          const fromRandomMatch = await consumePendingRandomMatch();
          const r = await recordWin({
            mode: "online",
            digits: d,
            guesses,
            timeSec: Number.isFinite(timeSec) && timeSec > 0 ? timeSec : null,
            opponentCount: opponents.length,
            fromRandomMatch,
          });
          if (r.newUnlocks.length > 0) setUnlocks(r.newUnlocks);
        })();
        if (Number.isFinite(timeSec) && timeSec > 0) {
          void saveRecordIfBest("online", d, timeSec, guesses).then((r) => {
            if (r.wasBest) setIsNewRecord(true);
          });
        }
      } else {
        void recordLoss("online");
        // Clear any stale random-match flag from this round so a later
        // non-random win doesn't get misattributed as a random-match win.
        void clearPendingRandomMatch();
      }
    }

    // Surface any unlocks that were queued by non-win recorders since
    // the last result screen (e.g. recordSoloPlayed on mount). Merge
    // them with whatever the win-path produced.
    void consumePendingUnlocks().then((queued) => {
      if (queued.length > 0) {
        setUnlocks((prev) => Array.from(new Set([...prev, ...queued])));
      }
    });

    if (showVictory) {
      playWin(settings.soundOn);
      successHaptic(settings.hapticsOn);
    } else {
      playLose(settings.soundOn);
      errorHaptic(settings.hapticsOn);
    }
  }, [isOnline, youWon, digits, guesses, showVictory, settings.soundOn, settings.hapticsOn]);

  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={
          showVictory
            ? [colors.gradientSoftFrom, colors.background]
            : [colors.destructive + "22", colors.background]
        }
        style={StyleSheet.absoluteFill}
      />
      <ScreenHeader title={isOnline ? t("result.online") : t("result.solo")} />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        <View style={styles.cardWrap}>
          {/* Confetti sits behind the card and is positionally absolute. */}
          <ParticleBurst active={showParticles && showVictory} color={colors.accent} />

          <Animated.View
            style={{ opacity: fade, transform: [{ translateY: lift }] }}
          >
            <GlassCard
              tone={showVictory ? "success" : "danger"}
              style={styles.card}
            >
              {isNewRecord ? (
                <Animated.View
                  style={[
                    styles.recordBadge,
                    {
                      backgroundColor: colors.accent,
                      transform: [
                        {
                          scale: burst.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.06],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Feather name="award" size={16} color={colors.accentForeground} />
                  <Text style={[styles.recordText, { color: colors.accentForeground }]}>
                    {t("result.newRecord")}
                  </Text>
                </Animated.View>
              ) : null}

              <View style={[styles.iconCircle, { backgroundColor: tone + "22" }]}>
                <Feather
                  name={showVictory ? "check-circle" : "x-circle"}
                  size={36}
                  color={tone}
                />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {isOnline
                  ? youWon
                    ? t("result.youGotIt")
                    : t("result.opponentWon", { name: params.winnerName || t("room.unknownWinner") })
                  : t("result.youGotIt")}
              </Text>
              {isOnline && !youWon ? (
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {t("result.youLost")}
                </Text>
              ) : null}

              {hidden ? (
                <View style={{ alignItems: "center", gap: 8, marginTop: 8 }}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>
                    {t("result.hidden")}
                  </Text>
                  <NumberDisplay digits={digits} reveal={hidden} />
                </View>
              ) : null}

              <View style={styles.statsRow}>
                {!isOnline ? (
                  <Stat label={t("result.time")} value={lz(formatTime(timeSec))} icon="clock" />
                ) : null}
                <Stat label={t("result.guesses")} value={lz(guesses)} icon="hash" />
                <Stat label={t("result.digits")} value={lz(digits)} icon="layers" />
              </View>
            </GlassCard>
          </Animated.View>
        </View>

        {unlocks.length > 0 ? (
          <View style={styles.unlocks}>
            <Text
              style={[styles.unlocksHead, { color: colors.mutedForeground }]}
            >
              {t("result.newAchievements")}
            </Text>
            {unlocks.map((id, i) => (
              <AchievementBanner key={id} id={id} index={i} />
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          {isOnline ? (
            <>
              {youWon && !redirect ? (
                <>
                  <PunishmentButton
                    used={punishmentUsed}
                    loading={punishmentLoading}
                    onPress={() => {
                      if (!code || punishmentUsed || punishmentLoading) return;
                      if (__DEV__) {
                        console.log("[punishment] button pressed", { code });
                      }
                      setPunishmentError(null);
                      // Open the target picker FIRST. The actual request
                      // is fired only once the winner taps a specific
                      // opponent in the picker.
                      setTargetPickerVisible(true);
                    }}
                  />
                  {punishmentError ? (
                    <Text style={[styles.punishErr, { color: colors.destructive }]}>
                      {punishmentError}
                    </Text>
                  ) : null}
                </>
              ) : null}
              {redirect && redirect.redirectedById === yourId ? (
                // Original target's second-press: draw a new card for
                // the player they just picked. No picker — the target
                // is already chosen. The reveal animation runs for
                // everyone via the standard onPunishmentRevealed path.
                <>
                  <Text
                    style={[styles.redirectHint, { color: colors.mutedForeground }]}
                  >
                    {t("punishment.redirectYourTurn").replace(
                      "{name}",
                      redirect.targetName,
                    )}
                  </Text>
                  <PunishmentButton
                    used={false}
                    loading={punishmentLoading}
                    idleLabel={t("punishment.drawNewCard")}
                    onPress={() => {
                      if (!code || punishmentLoading) return;
                      if (__DEV__) {
                        console.log("[punishment] redirect draw pressed", {
                          code,
                          targetId: redirect.targetId,
                        });
                      }
                      setPunishmentError(null);
                      setPunishmentLoading(true);
                      requestPunishmentCard(code, redirect.targetId);
                    }}
                  />
                  {punishmentError ? (
                    <Text style={[styles.punishErr, { color: colors.destructive }]}>
                      {punishmentError}
                    </Text>
                  ) : null}
                </>
              ) : null}
              {redirect && redirect.redirectedById !== yourId ? (
                <Text
                  style={[styles.redirectHint, { color: colors.mutedForeground }]}
                >
                  {t("punishment.redirectWaiting").replace(
                    "{name}",
                    redirect.redirectedByName,
                  )}
                </Text>
              ) : null}
              <Button
                title={t("result.rematch")}
                fullWidth
                onPress={() => {
                  playNewMatch(settings.soundOn);
                  // Only the host's rematch request actually resets the
                  // room on the server. For everyone else, fire-and-forget
                  // is fine — the room screen will receive the reset state
                  // via subscription. Either way we re-attach to the same
                  // room and let the room screen drive the next phase
                  // (waiting → host picks digits → playing).
                  if (code) requestRematch(code);
                  router.replace({
                    pathname: "/room",
                    params: { code },
                  });
                }}
              />
              <Button
                title={t("result.leaveRoom")}
                fullWidth
                variant="ghost"
                onPress={() => {
                  if (code) leaveRoom(code);
                  router.replace("/lobby");
                }}
              />
            </>
          ) : (
            <>
              <Button
                title={t("result.playAgain")}
                fullWidth
                onPress={() =>
                  router.replace({ pathname: "/solo", params: { digits: String(digits) } })
                }
              />
              <Button
                title={t("home.profile")}
                fullWidth
                variant="secondary"
                onPress={() => router.replace("/profile")}
              />
              <Button
                title={t("result.home")}
                fullWidth
                variant="ghost"
                onPress={() => router.replace("/")}
              />
            </>
          )}
        </View>
      </View>
      <PunishmentCardModal
        reveal={punishment}
        visible={punishmentVisible}
        resolved={punishmentResolved}
        isTarget={youAreTarget}
        onAccept={() => {
          playPunishmentAccept(settings.soundOn);
          if (code) respondPunishment(code, true);
        }}
        onRefuse={() => {
          playPunishmentRefuse(settings.soundOn);
          if (code) respondPunishment(code, false);
        }}
        onPickAnother={() => {
          // Open the reassign picker on top of the reveal modal — once
          // the target picks a new player we'll fire reassignPunishment,
          // server re-broadcasts a fresh reveal with the new target.
          if (__DEV__) {
            console.log("[punishment] pick-another opened", {
              candidates: reassignCandidates.length,
            });
          }
          setReassignPickerVisible(true);
        }}
        onClose={() => setPunishmentVisible(false)}
      />
      <TargetPickerModal
        visible={targetPickerVisible}
        opponents={opponents}
        onCancel={() => setTargetPickerVisible(false)}
        onPick={(opp) => {
          if (!code) return;
          if (__DEV__) {
            console.log("[punishment] target picked", {
              code,
              id: opp.id,
              name: opp.name,
            });
          }
          setTargetPickerVisible(false);
          setPunishmentLoading(true);
          // Counter is bumped on server-confirmed resolution (in the
          // onPunishmentResolved listener), not on intent — so a
          // rejected request doesn't unlock an achievement.
          requestPunishmentCard(code, opp.id);
        }}
      />
      <TargetPickerModal
        visible={reassignPickerVisible}
        opponents={reassignCandidates}
        onCancel={() => setReassignPickerVisible(false)}
        onPick={(opp) => {
          if (!code) return;
          if (__DEV__) {
            console.log("[punishment] reassign picked", {
              code,
              id: opp.id,
              name: opp.name,
            });
          }
          setReassignPickerVisible(false);
          // Optimistic loading state — until the server confirms the
          // redirect, we don't want the original modal to stay open if
          // the user double-taps. The actual UI swap happens when
          // `punishmentTargetChanged` lands.
          setPunishmentLoading(true);
          redirectPunishmentTarget(code, opp.id);
        }}
      />
    </View>
  );
}

/**
 * Lightweight modal that lists the losing players and lets the winner pick
 * exactly one as the punishment target. The actual request fires only when
 * a name is tapped — closing the modal does nothing.
 */
function TargetPickerModal({
  visible,
  opponents,
  onCancel,
  onPick,
}: {
  visible: boolean;
  opponents: { id: string; name: string }[];
  onCancel: () => void;
  onPick: (opp: { id: string; name: string }) => void;
}) {
  const colors = useColors();
  const { t, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={[
          targetStyles.backdrop,
          { backgroundColor: "rgba(0,0,0,0.7)" },
        ]}
      >
        <View
          style={[
            targetStyles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              targetStyles.title,
              { color: colors.foreground, writingDirection: wd },
            ]}
          >
            {t("punishment.pickTarget")}
          </Text>
          <Text
            style={[
              targetStyles.body,
              { color: colors.mutedForeground, writingDirection: wd },
            ]}
          >
            {t("punishment.pickTargetBody")}
          </Text>
          <View style={targetStyles.list}>
            {opponents.map((opp) => (
              <Pressable
                key={opp.id}
                onPress={() => onPick(opp)}
                style={({ pressed }) => [
                  targetStyles.row,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Feather name="user" size={16} color={colors.foreground} />
                <Text
                  style={[
                    targetStyles.rowLabel,
                    { color: colors.foreground, writingDirection: wd },
                  ]}
                  numberOfLines={1}
                >
                  {opp.name}
                </Text>
                <Feather
                  name={isRTL ? "chevron-left" : "chevron-right"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ))}
          </View>
          <Button
            title={t("common.cancel")}
            fullWidth
            variant="ghost"
            onPress={onCancel}
          />
        </View>
      </View>
    </Modal>
  );
}

const targetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  list: { gap: 8, marginVertical: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});

function Stat({
  label, value, icon,
}: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  const colors = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: colors.background + "cc", borderColor: colors.border }]}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 18, justifyContent: "space-between",
  },
  cardWrap: { position: "relative" },
  card: {
    padding: 24,
    alignItems: "center", gap: 14, position: "relative",
  },
  recordBadge: {
    position: "absolute", top: -14,
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  recordText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: -6 },
  label: { fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 10, width: "100%" },
  stat: {
    flex: 1, alignItems: "center", paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, gap: 4,
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  actions: { gap: 10 },
  punishErr: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: -2,
  },
  redirectHint: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 2,
  },
  unlocks: { gap: 8 },
  unlocksHead: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 4,
  },
});
