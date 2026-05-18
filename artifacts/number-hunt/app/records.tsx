import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { GlassCard } from "@/src/components/GlassCard";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatsOverview } from "@/src/components/StatsOverview";
import { useT } from "@/src/i18n/useT";
import {
  DEFAULT_STATS,
  clearRecords,
  clearStats,
  getRecords,
  getStats,
  type Records,
  type Stats,
} from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";
import { formatDate, formatTime } from "@/src/utils/scoring";

const DIGITS_LIST = [2, 3, 4] as const;

export default function RecordsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lz, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";
  const [records, setRecords] = useState<Records>({});
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([getRecords(), getStats()]);
    setRecords(r);
    setStats(s);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset wipes both surfaces — the single-best snapshots AND the lifetime
  // aggregates. Single dialog, single action.
  const onReset = () => {
    Alert.alert(t("records.resetTitle"), t("records.resetMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.reset"),
        style: "destructive",
        onPress: async () => {
          await Promise.all([clearRecords(), clearStats()]);
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
        <StatsOverview stats={stats} />

        <Text
          style={[styles.sectionHeading, { color: colors.mutedForeground, writingDirection: wd }]}
        >
          {t("stats.bestTimes")}
        </Text>

        {DIGITS_LIST.map((d) => {
          const r = records[d];
          const pd = stats.perDigit[d];
          const avg = pd.wins > 0 ? Math.round((pd.totalGuessesWon / pd.wins) * 10) / 10 : null;
          return (
            <GlassCard key={d} style={styles.card}>
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
                    {lz(formatTime(r.bestTimeSec))}
                  </Text>
                  <View style={styles.metaRow}>
                    <Meta icon="hash" label={t("records.guesses", { n: r.guesses })} />
                    <Meta icon="calendar" label={formatDate(r.dateISO)} />
                  </View>
                </>
              ) : (
                <View style={styles.emptyBlock}>
                  <Text
                    style={[styles.empty, { color: colors.mutedForeground, writingDirection: wd }]}
                  >
                    {t("records.empty")}
                  </Text>
                </View>
              )}

              {/* Aggregate row — always visible, even with no best time yet.
                  Shows lifetime wins + average guesses for this difficulty. */}
              <View style={[styles.aggRow, { borderTopColor: colors.border }]}>
                <View style={styles.aggCell}>
                  <Feather name="trending-up" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.aggText, { color: colors.mutedForeground }]}>
                    {pd.wins > 0
                      ? t("stats.winsCount", { n: pd.wins })
                      : t("stats.noWinsYet")}
                  </Text>
                </View>
                {avg != null ? (
                  <View style={styles.aggCell}>
                    <Feather name="activity" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.aggText, { color: colors.mutedForeground }]}>
                      {t("stats.avgGuesses", { n: avg })}
                    </Text>
                  </View>
                ) : null}
              </View>
            </GlassCard>
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
  sectionHeading: {
    fontSize: 12,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
    marginTop: 6,
    marginBottom: -4,
  },
  card: { padding: 18, gap: 8 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  timeText: { fontSize: 38, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyBlock: { paddingVertical: 4 },
  aggRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  aggCell: { flexDirection: "row", alignItems: "center", gap: 6 },
  aggText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
