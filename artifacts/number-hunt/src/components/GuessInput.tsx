import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useT } from "@/src/i18n/useT";

export function GuessInput({ value, digits }: { value: string; digits: number }) {
  const colors = useColors();
  const { lz } = useT();
  return (
    <View style={styles.row}>
      {Array.from({ length: digits }).map((_, i) => {
        const ch = value.charAt(i);
        const filled = !!ch;
        const isCursor = i === value.length;
        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                backgroundColor: filled ? colors.primary : colors.card,
                borderColor: isCursor ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: filled ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {ch ? lz(ch) : ""}
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
    gap: 10,
    justifyContent: "center",
  },
  cell: {
    width: 48,
    height: 60,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
});
