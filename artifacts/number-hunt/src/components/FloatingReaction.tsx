/**
 * A single floating reaction badge ("Ahmed #48291 🔥") that fades in,
 * drifts upward, and fades out. Parent passes a stable key and calls
 * `onDone` so it can be removed from the active list.
 */

import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  REACTION_DISPLAY_MS,
  looksLikeEmoji,
} from "@/src/services/reactionManager";

type Props = {
  name: string;
  reaction: string;
  isRTL: boolean;
  onDone: () => void;
};

export function FloatingReaction({ name, reaction, isRTL, onDone }: Props) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const emoji = looksLikeEmoji(reaction);

  useEffect(() => {
    const seq = Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(REACTION_DISPLAY_MS - 220 - 600),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(translateY, {
        toValue: -90,
        duration: REACTION_DISPLAY_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 8,
      }),
    ]);
    seq.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => {
      seq.stop();
    };
    // Animation params are constants — run exactly once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.row,
        {
          opacity,
          transform: [{ translateY }, { scale }],
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: emoji ? colors.primary : colors.foreground,
          shadowOpacity: emoji ? 0.45 : 0.18,
          shadowRadius: emoji ? 10 : 4,
        },
      ]}
      pointerEvents="none"
    >
      <Text
        style={[
          styles.name,
          {
            color: colors.mutedForeground,
            writingDirection: isRTL ? "rtl" : "ltr",
          },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <View style={styles.dot} />
      <Text
        style={[
          emoji ? styles.emoji : styles.text,
          { color: colors.foreground },
        ]}
        numberOfLines={1}
      >
        {reaction}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
    maxWidth: 260,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  name: { fontSize: 12, fontWeight: "600", maxWidth: 140 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#888", marginHorizontal: 6, opacity: 0.5 },
  text: { fontSize: 13, fontWeight: "700" },
  emoji: { fontSize: 22 },
});
