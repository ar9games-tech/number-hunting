import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { formatTime } from "@/src/utils/scoring";

export function Timer({
  running,
  onTick,
  resetSignal,
}: {
  running: boolean;
  onTick?: (sec: number) => void;
  resetSignal?: number;
}) {
  const colors = useColors();
  const [sec, setSec] = useState(0);
  const startRef = useRef<number | null>(null);
  const accumulatedRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSec(0);
    accumulatedRef.current = 0;
    startRef.current = running ? Date.now() : null;
  }, [resetSignal]);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        if (startRef.current != null) {
          const elapsed =
            accumulatedRef.current + Math.floor((Date.now() - startRef.current) / 1000);
          setSec(elapsed);
          onTick?.(elapsed);
        }
      }, 250);
    } else {
      if (startRef.current != null) {
        accumulatedRef.current += Math.floor((Date.now() - startRef.current) / 1000);
        startRef.current = null;
        setSec(accumulatedRef.current);
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onTick]);

  return (
    <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
      <Feather name="clock" size={14} color={colors.secondaryForeground} />
      <Text style={[styles.text, { color: colors.secondaryForeground }]}>{formatTime(sec)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  text: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
});
