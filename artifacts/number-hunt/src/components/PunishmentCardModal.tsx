import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { useT } from "@/src/i18n/useT";
import { getPunishmentCard } from "@/src/data/punishmentCards";
import type {
  PunishmentResolved,
  PunishmentReveal,
} from "@/src/net/socketPlaceholder";

/**
 * Full-screen pack-opening reveal for a punishment card.
 *
 * Animation phases:
 *   1. SHAKING — sealed pack jitters with a glow halo and floating sparkles.
 *   2. REVEALING — pack scales away; card slides up + scales in with glow.
 *   3. READY — Accept / Refuse buttons fade in *for the target only*.
 *      Everyone else sees "Waiting for {target} to decide…".
 *   4. RESOLVED — once the target's Accept/Refuse broadcast lands, the
 *      modal flips to the final outcome panel for everyone.
 */
const SHAKE_MS = 1100;
const REVEAL_MS = 650;

type Phase = "shaking" | "revealing" | "ready";

export function PunishmentCardModal({
  reveal,
  visible,
  resolved,
  isTarget,
  onAccept,
  onRefuse,
  onClose,
}: {
  reveal: PunishmentReveal | null;
  visible: boolean;
  /** Final Accept/Refuse decision, or null while we're still waiting. */
  resolved: PunishmentResolved | null;
  /** True only on the device of the player the winner picked. */
  isTarget: boolean;
  onAccept: () => void;
  onRefuse: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const { t, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";

  const [phase, setPhase] = useState<Phase>("shaking");
  // Local "I already tapped Accept/Refuse" guard so a double-tap doesn't
  // fire two ws events. Reset whenever a new reveal starts.
  const [responded, setResponded] = useState(false);

  // Pack animations.
  const shake = useRef(new Animated.Value(0)).current;
  const packScale = useRef(new Animated.Value(1)).current;
  const packOpacity = useRef(new Animated.Value(1)).current;
  // Card animations.
  const cardScale = useRef(new Animated.Value(0.4)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(40)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  // Sparkle "particles" — handful of small dots looping outward.
  const sparkles = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!visible || !reveal) return;
    // Reset state for every fresh reveal.
    setPhase("shaking");
    setResponded(false);
    shake.setValue(0);
    packScale.setValue(1);
    packOpacity.setValue(1);
    cardScale.setValue(0.4);
    cardOpacity.setValue(0);
    cardTranslate.setValue(40);
    glow.setValue(0);
    buttonsOpacity.setValue(0);

    // Continuous shake while sealed.
    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, {
          toValue: 1,
          duration: 90,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: -1,
          duration: 90,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    shakeLoop.start();

    Animated.timing(glow, {
      toValue: 1,
      duration: SHAKE_MS,
      useNativeDriver: false,
    }).start();
    const sparkleLoops = sparkles.map((s, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(s, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(s, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    sparkleLoops.forEach((l) => l.start());

    const t1 = setTimeout(() => {
      shakeLoop.stop();
      setPhase("revealing");
      Animated.parallel([
        Animated.timing(packScale, {
          toValue: 1.6,
          duration: REVEAL_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(packOpacity, {
          toValue: 0,
          duration: REVEAL_MS,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: REVEAL_MS,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslate, {
          toValue: 0,
          duration: REVEAL_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, SHAKE_MS);

    const t2 = setTimeout(() => {
      setPhase("ready");
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }, SHAKE_MS + REVEAL_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      shakeLoop.stop();
      sparkleLoops.forEach((l) => l.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reveal?.cardId, reveal?.drawnBy, reveal?.targetName]);

  if (!reveal) return null;
  const card = getPunishmentCard(reveal.cardId);
  const accent =
    card.tone === "destructive"
      ? colors.destructive
      : card.tone === "primary"
        ? colors.primary
        : card.tone === "warning"
          ? colors.warning
          : colors.accent;

  const shakeTranslate = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-6, 6],
  });
  const shakeRotate = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-4deg", "4deg"],
  });
  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.9],
  });

  const showResolution = phase === "ready" && resolved !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (phase === "ready") onClose();
      }}
    >
      <View style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.78)" }]}>
        {/* Sparkle layer */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {sparkles.map((s, i) => {
            const angle = (i / sparkles.length) * Math.PI * 2;
            const dist = 130;
            const tx = s.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.cos(angle) * dist],
            });
            const ty = s.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.sin(angle) * dist],
            });
            const opacity = s.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0, 1, 0],
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.sparkle,
                  {
                    backgroundColor: accent,
                    shadowColor: accent,
                    opacity,
                    transform: [{ translateX: tx }, { translateY: ty }],
                  },
                ]}
              />
            );
          })}
        </View>

        {showResolution ? (
          <ResolutionPanel
            resolved={resolved!}
            colors={colors}
            wd={wd}
            t={t}
            onClose={onClose}
          />
        ) : (
          <View style={styles.stage}>
            {/* Sealed pack */}
            {phase === "shaking" || phase === "revealing" ? (
              <Animated.View
                style={[
                  styles.pack,
                  {
                    backgroundColor: colors.card,
                    borderColor: accent,
                    shadowColor: accent,
                    opacity: packOpacity,
                    transform: [
                      { translateX: phase === "shaking" ? shakeTranslate : 0 },
                      { rotate: phase === "shaking" ? shakeRotate : "0deg" },
                      { scale: packScale },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.glowHalo,
                    {
                      backgroundColor: accent + "33",
                      opacity: glowOpacity,
                    },
                  ]}
                />
                <Text style={styles.packQuestion}>?</Text>
                <Text style={[styles.packLabel, { color: accent }]}>
                  {t("punishment.opening")}
                </Text>
              </Animated.View>
            ) : null}

            {/* Revealed card */}
            {phase !== "shaking" ? (
              <Animated.View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: accent,
                    shadowColor: accent,
                    opacity: cardOpacity,
                    transform: [
                      { translateY: cardTranslate },
                      { scale: cardScale },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={[accent + "55", "transparent"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.cardEmoji}>{card.emoji}</Text>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: colors.foreground, writingDirection: wd },
                  ]}
                  numberOfLines={2}
                >
                  {t(card.titleKey)}
                </Text>
                <Text
                  style={[
                    styles.cardBody,
                    { color: colors.mutedForeground, writingDirection: wd },
                  ]}
                >
                  {t(card.bodyKey)}
                </Text>
                {reveal.targetName ? (
                  <Text
                    style={[
                      styles.targetLabel,
                      { color: accent, writingDirection: wd },
                    ]}
                  >
                    {t("punishment.targetLabel", { name: reveal.targetName })}
                  </Text>
                ) : null}
                {reveal.drawnBy ? (
                  <Text
                    style={[
                      styles.drawnBy,
                      { color: colors.mutedForeground, writingDirection: wd },
                    ]}
                  >
                    {t("punishment.drawnBy", { name: reveal.drawnBy })}
                  </Text>
                ) : null}
              </Animated.View>
            ) : null}

            {phase === "ready" ? (
              <Animated.View
                style={[styles.actions, { opacity: buttonsOpacity }]}
              >
                {isTarget ? (
                  <>
                    <Button
                      title={t("punishment.accept")}
                      fullWidth
                      // Disable both buttons the moment one is tapped so a
                      // jittery double-tap can't send two events. The
                      // server is also guarded via `alreadyResolved`.
                      disabled={responded}
                      onPress={() => {
                        if (responded) return;
                        setResponded(true);
                        onAccept();
                      }}
                    />
                    <Button
                      title={t("punishment.refuse")}
                      fullWidth
                      variant="ghost"
                      disabled={responded}
                      onPress={() => {
                        if (responded) return;
                        setResponded(true);
                        onRefuse();
                      }}
                    />
                  </>
                ) : (
                  <Text
                    style={[
                      styles.watching,
                      { color: colors.mutedForeground, writingDirection: wd },
                    ]}
                  >
                    {t("punishment.waitingDecision", {
                      name: reveal.targetName,
                    })}
                  </Text>
                )}
              </Animated.View>
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

function ResolutionPanel({
  resolved,
  colors,
  wd,
  t,
  onClose,
}: {
  resolved: PunishmentResolved;
  colors: ReturnType<typeof useColors>;
  wd: "ltr" | "rtl";
  t: ReturnType<typeof useT>["t"];
  onClose: () => void;
}) {
  const accent = resolved.accepted ? colors.success : colors.destructive;
  const icon = resolved.accepted ? "check-circle" : "x-octagon";
  const title = resolved.accepted
    ? t("punishment.accepted")
    : t("punishment.refused");
  const body = resolved.accepted
    ? t("punishment.acceptedBody", { name: resolved.targetName })
    : t("punishment.refusedShort");
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: accent },
      ]}
    >
      <Feather name={icon} size={56} color={accent} />
      <Text
        style={[styles.cardTitle, { color: accent, writingDirection: wd }]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.cardBody,
          { color: colors.mutedForeground, writingDirection: wd },
        ]}
      >
        {body}
      </Text>
      <View style={styles.actions}>
        <Button title={t("punishment.close")} fullWidth onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stage: { width: "100%", maxWidth: 360, alignItems: "center", gap: 18 },
  pack: {
    width: 200,
    height: 280,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    ...(Platform.OS === "android" ? { elevation: 12 } : null),
  },
  glowHalo: {
    position: "absolute",
    width: 260,
    height: 340,
    borderRadius: 200,
  },
  packQuestion: {
    fontSize: 110,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowRadius: 6,
  },
  packLabel: {
    marginTop: 8,
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 2,
    padding: 24,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    shadowOpacity: 0.6,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    ...(Platform.OS === "android" ? { elevation: 10 } : null),
  },
  cardEmoji: { fontSize: 72, marginBottom: 4 },
  cardTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  cardBody: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 20,
  },
  targetLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  drawnBy: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    fontStyle: "italic",
  },
  watching: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    paddingVertical: 6,
  },
  actions: { width: "100%", gap: 8, marginTop: 6 },
  sparkle: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
