/**
 * Floating "open reactions" button for the in-game online room.
 *
 * - Positioned by the parent (absolute layout in room.tsx).
 * - Shows a sweeping cooldown ring while disabled by the parent's
 *   per-player cooldown ref. The animation is purely cosmetic — the
 *   real cooldown gate is held in the parent.
 */

import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { REACTION_COOLDOWN_MS } from "@/src/services/reactionManager";

type Props = {
  onPress: () => void;
  /** True while the parent is still in its per-player cooldown window. */
  cooling: boolean;
  /** Accessibility label, already localized by the parent. */
  label: string;
};

export function ReactionsButton({ onPress, cooling, label }: Props) {
  const colors = useColors();
  const sweep = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (cooling) {
      sweep.setValue(0);
      Animated.timing(sweep, {
        toValue: 1,
        duration: REACTION_COOLDOWN_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      sweep.setValue(0);
    }
  }, [cooling, sweep]);

  const onPressIn = () => {
    Animated.spring(press, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start();
  };
  const onPressOut = () => {
    Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  };

  const ringOpacity = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: colors.primary,
            opacity: cooling ? ringOpacity : 0,
          },
        ]}
        pointerEvents="none"
      />
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={cooling}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: cooling }}
        hitSlop={8}
      >
        <Animated.View
          style={[
            styles.btn,
            {
              backgroundColor: cooling ? colors.muted : colors.primary,
              transform: [{ scale: press }],
              shadowColor: colors.foreground,
            },
          ]}
        >
          <Feather
            name="smile"
            size={22}
            color={cooling ? colors.mutedForeground : colors.primaryForeground}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const SIZE = 48;
const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ring: {
    position: "absolute",
    width: SIZE + 8,
    height: SIZE + 8,
    borderRadius: (SIZE + 8) / 2,
    borderWidth: 2,
  },
});
