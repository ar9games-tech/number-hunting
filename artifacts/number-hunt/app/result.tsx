import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
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
  leaveRoom,
  onPunishmentError,
  onPunishmentRevealed,
  requestPunishmentCard,
  requestRematch,
  type PunishmentReveal,
} from "@/src/net/socketPlaceholder";
import { playPunishmentReveal } from "@/src/services/soundManager";
import { recordLoss, recordWin, saveRecordIfBest } from "@/src/storage/storage";
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
  // Punishment state. The winner sees a button until they tap once; everyone
  // (winner + losers) sees the reveal modal when the server broadcasts.
  const [punishment, setPunishment] = React.useState<PunishmentReveal | null>(null);
  const [punishmentVisible, setPunishmentVisible] = React.useState(false);
  const [punishmentUsed, setPunishmentUsed] = React.useState(false);
  const [punishmentLoading, setPunishmentLoading] = React.useState(false);
  const [punishmentError, setPunishmentError] = React.useState<string | null>(null);

  useEffect(() => {
    if (!isOnline || !code) return;
    const unsubReveal = onPunishmentRevealed(code, (reveal) => {
      if (__DEV__) console.log("[punishment] modal opened", { cardId: reveal.cardId });
      setPunishment(reveal);
      setPunishmentVisible(true);
      setPunishmentUsed(true);
      setPunishmentLoading(false);
      setPunishmentError(null);
      playPunishmentReveal(settings.soundOn);
    });
    const unsubErr = onPunishmentError(code, (reason) => {
      setPunishmentLoading(false);
      if (reason === "alreadyUsed") {
        setPunishmentUsed(true);
        return;
      }
      // Surface friendly copy for the rare cases the button shouldn't have
      // been pressable (e.g. status drifted just before the request landed).
      const body =
        reason === "notWinner"
          ? t("punishment.notWinnerBody")
          : reason === "notWon"
            ? t("punishment.notWonBody")
            : t("punishment.errorTitle");
      setPunishmentError(body);
    });
    return () => {
      unsubReveal();
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
        void recordWin({
          mode: "online",
          digits: d,
          guesses,
          timeSec: Number.isFinite(timeSec) && timeSec > 0 ? timeSec : null,
        }).then((r) => {
          if (r.newUnlocks.length > 0) setUnlocks(r.newUnlocks);
        });
        if (Number.isFinite(timeSec) && timeSec > 0) {
          void saveRecordIfBest("online", d, timeSec, guesses).then((r) => {
            if (r.wasBest) setIsNewRecord(true);
          });
        }
      } else {
        void recordLoss("online");
      }
    }

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
              {youWon ? (
                <>
                  <PunishmentButton
                    used={punishmentUsed}
                    loading={punishmentLoading}
                    onPress={() => {
                      if (!code || punishmentUsed || punishmentLoading) return;
                      if (__DEV__) {
                        console.log("[punishment] button pressed", { code });
                      }
                      setPunishmentLoading(true);
                      setPunishmentError(null);
                      requestPunishmentCard(code);
                    }}
                  />
                  {punishmentError ? (
                    <Text style={[styles.punishErr, { color: colors.destructive }]}>
                      {punishmentError}
                    </Text>
                  ) : null}
                </>
              ) : null}
              <Button
                title={t("result.rematch")}
                fullWidth
                onPress={() => {
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
        isWinner={youWon}
        onClose={() => setPunishmentVisible(false)}
      />
    </View>
  );
}

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
  unlocks: { gap: 8 },
  unlocksHead: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 4,
  },
});
