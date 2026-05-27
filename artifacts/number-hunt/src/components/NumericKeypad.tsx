import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useT } from "@/src/i18n/useT";

type KeyValue = string | "back" | "clear";

// Layout stays a 3-column 4-row grid for muscle memory; the old "submit"
// key in the bottom-right has been replaced with a clear-all key now
// that guesses auto-submit when the full digit count is entered.
// We render explicit rows of 3 cells (each cell `flex:1`) so the grid
// is guaranteed to be 3 columns at every width — a previous
// flexWrap-based grid could overflow by a fraction of a percent on
// narrow viewports and wrap to 2 columns × 6 rows, doubling the
// keypad's height and pushing it off-screen on short phones.
const ROWS: KeyValue[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["back", "0", "clear"],
];

export function NumericKeypad({
  onDigit,
  onBackspace,
  onClear,
  disabled = false,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  /** Locks the whole keypad — used during the brief auto-submit window. */
  disabled?: boolean;
}) {
  return (
    <View style={styles.grid} {...({ dir: "ltr" } as object)}>
      {ROWS.map((row, r) => (
        <View key={`row-${r}`} style={styles.row}>
          {row.map((k, i) => (
            <Key
              key={`${k}-${r}-${i}`}
              value={k}
              disabled={disabled}
              onPress={() => {
                if (k === "back") onBackspace();
                else if (k === "clear") onClear();
                else onDigit(k); // always emit English digit to game logic
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function Key({
  value,
  onPress,
  disabled,
}: {
  value: KeyValue;
  onPress: () => void;
  disabled: boolean;
}) {
  const colors = useColors();
  const { lz, t } = useT();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  const isAction = value === "back" || value === "clear";

  const bg = isAction ? colors.muted : colors.card;
  const fg = colors.foreground;

  return (
    <Animated.View style={[styles.cell, { transform: [{ scale }] }]} collapsable={false}>
      <Pressable
        onPress={() => {
          if (disabled) return;
          onPress();
        }}
        onPressIn={() => !disabled && animateTo(0.93)}
        onPressOut={() => animateTo(1)}
        style={[
          styles.key,
          { backgroundColor: bg, borderColor: colors.border, opacity: disabled ? 0.5 : 1 },
        ]}
        accessibilityLabel={
          value === "back"
            ? t("keypad.backspace")
            : value === "clear"
              ? t("keypad.clear")
              : value
        }
      >
        {isAction ? (
          <Feather
            name={value === "back" ? "delete" : "x"}
            size={24}
            color={fg}
          />
        ) : (
          <Text style={[styles.label, { color: fg }]}>{lz(value)}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Column of explicit rows — guarantees 3-col layout at every width.
  grid: {
    flexDirection: "column",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  // Each cell takes an equal third of the row via flex:1; basis:0
  // ensures gap is distributed evenly and no cell can overflow.
  cell: {
    flex: 1,
    flexBasis: 0,
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
