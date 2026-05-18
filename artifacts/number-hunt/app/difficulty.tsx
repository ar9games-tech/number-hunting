import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useT } from "@/src/i18n/useT";
import { webBottomInset } from "@/src/theme/theme";

export default function DifficultyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useT();
  // Solo-only: online flows pick their digit length from inside the room
  // (host only, once the room is full). Older `?mode=...` params are
  // ignored — the only valid destination from here is /solo.
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;
  const wd = isRTL ? "rtl" : "ltr";

  const onPick = (digits: 2 | 3 | 4) => {
    router.replace({ pathname: "/solo", params: { digits: String(digits) } });
  };

  const descKey = (d: 2 | 3 | 4) =>
    d === 2 ? ("diff.2desc" as const) : d === 3 ? ("diff.3desc" as const) : ("diff.4desc" as const);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("diff.title")} />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        <Text style={[styles.lead, { color: colors.mutedForeground, writingDirection: wd }]}>
          {t("diff.lead")}
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
              <Text style={[styles.label, { color: colors.mutedForeground, writingDirection: wd }]}>
                {t("diff.label", { n: d })}
              </Text>
              <View style={styles.cellsRow}>
                {Array.from({ length: d }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.cell,
                      { backgroundColor: colors.background, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.cellText, { color: colors.primary }]}>X</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground, writingDirection: wd }]}>
                {t(descKey(d))}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  lead: { fontSize: 15, fontFamily: "Inter_400Regular", paddingHorizontal: 4 },
  grid: { gap: 14 },
  card: { padding: 18, borderRadius: 20, borderWidth: 1, gap: 12 },
  label: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, textTransform: "uppercase",
  },
  cellsRow: { flexDirection: "row", gap: 10 },
  cell: {
    width: 44, height: 56, borderRadius: 12, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  cellText: { fontSize: 24, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
