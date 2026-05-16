import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/src/contexts/SettingsContext";

type KeyValue = string | "back" | "submit";

const KEYS: KeyValue[] = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "back", "0", "submit",
];

export function NumericKeypad({
  onDigit,
  onBackspace,
  onSubmit,
  canSubmit,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  return (
    <View style={styles.grid}>
      {KEYS.map((k, i) => (
        <Key
          key={`${k}-${i}`}
          value={k}
          canSubmit={canSubmit}
          onPress={() => {
            if (k === "back") onBackspace();
            else if (k === "submit") {
              if (canSubmit) onSubmit();
            } else onDigit(k);
          }}
        />
      ))}
    </View>
  );
}

function Key({
  value,
  onPress,
  canSubmit,
}: {
  value: KeyValue;
  onPress: () => void;
  canSubmit: boolean;
}) {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  const isAction = value === "back" || value === "submit";
  const isSubmit = value === "submit";
  const submitEnabled = !isSubmit || canSubmit;

  const bg = isSubmit
    ? canSubmit
      ? colors.accent
      : colors.muted
    : value === "back"
      ? colors.muted
      : colors.card;
  const fg = isSubmit
    ? canSubmit
      ? colors.accentForeground
      : colors.mutedForeground
    : colors.foreground;

  return (
    <Animated.View style={[styles.cell, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => {
          if (!submitEnabled) return;
          if (settings.hapticsOn && Platform.OS !== "web") {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress();
        }}
        onPressIn={() => submitEnabled && animateTo(0.93)}
        onPressOut={() => animateTo(1)}
        style={[
          styles.key,
          { backgroundColor: bg, borderColor: colors.border, opacity: submitEnabled ? 1 : 0.6 },
        ]}
      >
        {isAction ? (
          <Feather
            name={value === "back" ? "delete" : "check"}
            size={24}
            color={fg}
          />
        ) : (
          <Text style={[styles.label, { color: fg }]}>{value}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    width: "31.5%",
  },
  key: {
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 26,
    fontFamily: "Inter_600SemiBold",
  },
});
