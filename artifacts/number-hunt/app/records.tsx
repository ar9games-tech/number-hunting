import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useT } from "@/src/i18n/useT";
import { clearRecords, getRecords, type Records } from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";
import { formatDate, formatTime } from "@/src/utils/scoring";

export default function RecordsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [records, setRecords] = useState<Records>({});
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const load = useCallback(async () => {
    setRecords(await getRecords());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onReset = () => {
    Alert.alert(t("records.resetTitle"), t("records.resetMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.reset"),
        style: "destructive",
        onPress: async () => {
          await clearRecords();
          await load();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("records.title")} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {([2, 3, 4] as const).map((d) => {
          const r = records[d];
          return (
            <View
              key={d}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.rowTop}>
                <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.badgeText, { color: colors.secondaryForeground }]}>
                    {t("records.label", { n: d })}
                  </Text>
                </View>
                {r ? (
                  <Feather name="award" size={18} color={colors.accent} />
                ) : (
                  <Feather name="clock" size={18} color={colors.mutedForeground} />
                )}
              </View>
              {r ? (
                <>
                  <Text style={[styles.timeText, { color: colors.foreground }]}>
                    {formatTime(r.bestTimeSec)}
                  </Text>
                  <View style={styles.metaRow}>
                    <Meta icon="hash" label={t("records.guesses", { n: r.guesses })} />
                    <Meta icon="calendar" label={formatDate(r.dateISO)} />
                  </View>
                </>
              ) : (
                <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                  {t("records.empty")}
                </Text>
              )}
            </View>
          );
        })}
        <Button title={t("records.reset")} variant="ghost" fullWidth onPress={onReset} />
      </ScrollView>
    </View>
  );
}

function Meta({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.meta}>
      <Feather name={icon} size={13} color={colors.mutedForeground} />
      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  card: { padding: 18, borderRadius: 20, borderWidth: 1, gap: 8 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  timeText: { fontSize: 38, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 8 },
});
