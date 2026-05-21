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
import type { PunishmentReveal } from "@/src/net/socketPlaceholder";

/**
 * Unified neutral color used by EVERY pre-reveal pack — sparkles, halo,
 * pack border / glow / label. Kept constant across cards so the target
 * can't read the result from the wrapper before the card is shown.
 */
const PACK_PURPLE = "#8b5cf6";

/**
 * Full-screen pack-opening reveal for a punishment card.
 *
 * Animation phases:
 *   1. SHAKING — sealed pack jitters with a glow halo and floating sparkles.
 *   2. REVEALING — pack scales away; card slides up + scales in with glow.
 *   3. READY — action row fades in. The reveal IS the result — there is
 *      no Accept / Refuse decision anymore. Everyone (winner, target,
 *      and spectators) sees a single "Close" button that dismisses the
 *      modal locally on their own device. EXCEPTION: the very first
 *      reveal of a `chooseAnother` card (when `canPass` is true) still
 *      shows the target a "Pick another player" button so they can
 *      redirect the punishment — after the redirected reveal lands,
 *      everyone is back to a single Close button.
 */
const SHAKE_MS = 1100;
const REVEAL_MS = 650;

type Phase = "shaking" | "revealing" | "ready";

export function PunishmentCardModal({
  reveal,
  visible,
  isTarget,
  onPickAnother,
  redirectInFlight,
  onClose,
}: {
  reveal: PunishmentReveal | null;
  visible: boolean;
  /** True only on the device of the player the winner picked. */
  isTarget: boolean;
  /**
   * Invoked when the target taps "Pick another player" on a fresh
   * chooseAnother card. The parent screen opens its target picker and
   * fires the actual reassign event from there. Only shown for the
   * interstitial chooseAnother+canPass reveal — every other reveal
   * collapses to a plain Close button for everyone.
   */
  onPickAnother: () => void;
  /**
   * True once the target has committed a new target via the picker —
   * the modal locks the pick-another button until the server's
   * `punishmentTargetChanged` broadcast dismisses the modal. Prevents
   * a second pick during the in-flight redirect window.
   */
  redirectInFlight?: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const { t, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";

  const [phase, setPhase] = useState<Phase>("shaking");

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
  }, [visible, reveal?.cardId, reveal?.drawnBy, reveal?.targetName, reveal?.targetId, reveal?.canPass]);

  if (!reveal) return null;
  const card = getPunishmentCard(reveal.cardId);
  // Result accent (used only on the revealed card itself): red for the
  // single elimination card, green for everything else — Vote, Another
  // Chance, and Choose Another all share the "safe" green border so the
  // visual outcome is immediately readable. The per-card `card.tone` is
  // intentionally ignored here; the spec collapses the palette to red /
  // green at reveal time.
  const revealAccent =
    reveal.cardId === "directElimination" ? colors.destructive : colors.success;

  // The only reveal that still demands an in-modal action from the
  // target is the *first* chooseAnother card (the one the target can
  // pass). Every other reveal — including the post-redirect chooseAnother
  // reveal where `canPass` is false — collapses to a single Close button
  // for everyone.
  const showPickAnother =
    isTarget && reveal.cardId === "chooseAnother" && reveal.canPass;

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Hardware back / Esc dismisses the modal once the reveal has
        // finished — but never during the pick-another interstitial,
        // since the target must commit a new player before the chain
        // can continue.
        if (phase === "ready" && !showPickAnother) onClose();
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
            // Sparkles always glow purple — they belong to the pack
            // ambience and must never hint at the result color.
            return (
              <Animated.View
                key={i}
                style={[
                  styles.sparkle,
                  {
                    backgroundColor: PACK_PURPLE,
                    shadowColor: PACK_PURPLE,
                    opacity,
                    transform: [{ translateX: tx }, { translateY: ty }],
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.stage}>
          {/* Sealed pack */}
          {phase === "shaking" || phase === "revealing" ? (
            // The sealed pack is uniformly purple regardless of the
            // card inside — pack border, glow halo, and label all use
            // PACK_PURPLE so the target can't infer the result early.
            <Animated.View
              style={[
                styles.pack,
                {
                  backgroundColor: colors.card,
                  borderColor: PACK_PURPLE,
                  shadowColor: PACK_PURPLE,
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
                    backgroundColor: PACK_PURPLE + "33",
                    opacity: glowOpacity,
                  },
                ]}
              />
              <Text style={styles.packQuestion}>?</Text>
              <Text style={[styles.packLabel, { color: PACK_PURPLE }]}>
                {t("punishment.opening")}
              </Text>
            </Animated.View>
          ) : null}

          {/* Revealed card — now wears the result color (red for
              Direct Elimination, green for all other cards). */}
          {phase !== "shaking" ? (
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: revealAccent,
                  shadowColor: revealAccent,
                  opacity: cardOpacity,
                  transform: [
                    { translateY: cardTranslate },
                    { scale: cardScale },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[revealAccent + "55", "transparent"]}
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
                    { color: revealAccent, writingDirection: wd },
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
              {showPickAnother ? (
                // chooseAnother interstitial — only the target can act,
                // and the only action is to redirect to a new player.
                // No "Refuse" path: per the new rules, refusal/acceptance
                // is no longer a concept. The picker (opened by the
                // parent) commits the new target, then the server
                // re-broadcasts a fresh reveal where everyone — target
                // included — sees the single Close button below.
                <Button
                  title={t("punishment.pickAnother")}
                  fullWidth
                  disabled={!!redirectInFlight}
                  onPress={() => {
                    if (redirectInFlight) return;
                    onPickAnother();
                  }}
                />
              ) : (
                // Default reveal action — one button, everyone (winner,
                // target, spectators) sees it, each device dismisses
                // independently. No server round-trip; closing on one
                // device must not affect any other player's screen.
                <Button
                  title={t("punishment.close")}
                  fullWidth
                  onPress={onClose}
                />
              )}
            </Animated.View>
          ) : null}
        </View>
      </View>
    </Modal>
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
  },
  actions: { width: "100%", gap: 10 },
  sparkle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: "center",
    top: "50%",
    left: "50%",
    marginLeft: -4,
    marginTop: -4,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    ...(Platform.OS === "android" ? { elevation: 6 } : null),
  },
});
