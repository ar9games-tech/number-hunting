import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/src/components/GlassCard";
import { useT } from "@/src/i18n/useT";
import type { Stats } from "@/src/storage/storage";

/**
 * Lifetime-stats hero card for the records screen. Renders the aggregate
 * counters (games, W/L, win rate) plus the two streak chips. Shows a soft
 * empty state when the player hasn't finished a game yet.
 */
export function StatsOverview({ stats }: { stats: Stats }) {
  const colors = useColors();
  const { t, lz, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";

  const hasData = stats.gamesPlayed > 0;
  const winRatePct = hasData ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  return (
    <GlassCard tone="primary" style={styles.card}>
      <LinearGradient
        colors={[colors.gradientSoftFrom, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: colors.foreground, writingDirection: wd }]}>
          {t("stats.overview")}
        </Text>
        <Feather name="bar-chart-2" size={18} color={colors.primary} />
      </View>

      {!hasData ? (
        <View style={styles.empty}>
          <Feather name="bar-chart-2" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, writingDirection: wd }]}>
            {t("stats.empty")}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            <Cell label={t("stats.games")} value={lz(stats.gamesPlayed)} icon="layers" />
            <Cell label={t("stats.wins")} value={lz(stats.wins)} icon="check" tint={colors.success} />
            <Cell
              label={t("stats.losses")}
              value={lz(stats.losses)}
              icon="x"
              tint={colors.destructive}
            />
            <Cell
              label={t("stats.winRate")}
              value={`${lz(winRatePct)}%`}
              icon="trending-up"
              tint={colors.primary}
            />
          </View>
          <View style={styles.streakRow}>
            <StreakChip
              icon="zap"
              label={t("stats.currentStreak")}
              value={lz(stats.currentStreak)}
              color={colors.accent}
            />
            <StreakChip
              icon="award"
              label={t("stats.bestStreak")}
              value={lz(stats.bestStreak)}
              color={colors.warning}
            />
          </View>
        </>
      )}
    </GlassCard>
  );
}

function Cell({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  tint?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.cell}>
      <View style={[styles.cellIcon, { backgroundColor: (tint ?? colors.primary) + "22" }]}>
        <Feather name={icon} size={14} color={tint ?? colors.primary} />
      </View>
      <Text style={[styles.cellValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.cellLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function StreakChip({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.chip, { backgroundColor: color + "1f" }]}>
      <Feather name={icon} size={14} color={color} />
      <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.chipValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { fontSize: 13, letterSpacing: 1.2, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", gap: 8, paddingVertical: 22 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: {
    flexBasis: "47%",
    flexGrow: 1,
    alignItems: "flex-start",
    gap: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(127,127,127,0.06)",
  },
  cellIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cellValue: { fontSize: 22, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  cellLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  streakRow: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  chipLabel: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  chipValue: { fontSize: 16, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
});
