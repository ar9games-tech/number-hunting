import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function NumberDisplay({
  digits,
  reveal,
}: {
  digits: number;
  reveal?: string | null;
}) {
  const colors = useColors();
  const slots = Array.from({ length: digits });
  return (
    <View style={styles.row}>
      {slots.map((_, i) => {
        const ch = reveal && reveal.length === digits ? reveal.charAt(i) : null;
        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                backgroundColor: colors.card,
                borderColor: ch ? colors.accent : colors.border,
              },
            ]}
          >
            <Text style={[styles.text, { color: ch ? colors.accent : colors.mutedForeground }]}>
              {ch ?? "X"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  cell: {
    width: 56,
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
  },
});
