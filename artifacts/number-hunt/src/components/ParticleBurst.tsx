import React, { useEffect, useMemo } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * Radial confetti burst. Spawns `count` small circles that fly outward from
 * the center with random angles, fade out, and shrink. Used on the result
 * screen to celebrate a win. Renders nothing when `active` is false.
 *
 * Implementation note: the particles are absolutely positioned over the
 * parent and pointerEvents="none" so they never block touches.
 */
export function ParticleBurst({
  active,
  count = 18,
  color,
}: {
  active: boolean;
  count?: number;
  color?: string;
}) {
  const colors = useColors();
  const tone = color ?? colors.accent;

  // Pre-compute particle geometry once per mount so re-renders don't
  // re-randomize positions mid-animation.
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const distance = 90 + Math.random() * 90;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          size: 6 + Math.random() * 8,
          delay: Math.floor(Math.random() * 120),
          progress: new Animated.Value(0),
        };
      }),
    [count],
  );

  useEffect(() => {
    if (!active) return;
    particles.forEach((p) => p.progress.setValue(0));
    Animated.stagger(
      35,
      particles.map((p) =>
        Animated.timing(p.progress, {
          toValue: 1,
          duration: 900 + Math.random() * 400,
          delay: p.delay,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [active, particles]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              backgroundColor: tone,
              opacity: p.progress.interpolate({
                inputRange: [0, 0.15, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateX: p.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, p.dx],
                  }),
                },
                {
                  translateY: p.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, p.dy],
                  }),
                },
                {
                  scale: p.progress.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.4, 1, 0.6],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    top: "40%",
    left: "50%",
    borderRadius: 999,
  },
});
