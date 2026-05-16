import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { webBottomInset } from "@/src/theme/theme";

type ModeParam = "solo" | "online-create" | "online-join";

export default function DifficultyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; code?: string }>();
  const mode = (params.mode as ModeParam | undefined) ?? "solo";
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const onPick = (digits: 2 | 3 | 4) => {
    if (mode === "solo") {
      router.replace({ pathname: "/solo", params: { digits: String(digits) } });
    } else if (mode === "online-create") {
      router.replace({
        pathname: "/room",
        params: { role: "host", digits: String(digits) },
      });
    } else {
      router.replace({
        pathname: "/room",
        params: { role: "guest", digits: String(digits), code: params.code ?? "" },
      });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Choose Difficulty" />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        <Text style={[styles.lead, { color: colors.mutedForeground }]}>
          How long should the hidden number be?
        </Text>
        <View style={styles.grid}>
          {([2, 3, 4] as const).map((d) => (
            <Pressable
              key={d}
              onPress={() => onPick(d)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {d}-digit
              </Text>
              <View style={styles.cellsRow}>
                {Array.from({ length: d }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text style={[styles.cellText, { color: colors.primary }]}>X</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {d === 2 ? "Quick warmup" : d === 3 ? "Balanced" : "True challenge"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  lead: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 4,
  },
  grid: {
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cellsRow: {
    flexDirection: "row",
    gap: 10,
  },
  cell: {
    width: 44,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cellText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
