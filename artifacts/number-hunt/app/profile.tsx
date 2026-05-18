import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/src/components/GlassCard";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatsOverview } from "@/src/components/StatsOverview";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import {
  DEFAULT_ONLINE_STATS,
  formatPlayerIdentity,
  getOnlineStats,
  getRecords,
  type ModeRecords,
  type OnlineStats,
  type Records,
} from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";
import { formatTime } from "@/src/utils/scoring";

const DIGITS_LIST = [2, 3, 4] as const;

/**
 * Profile dashboard — the single home for everything record/stat related
 * now that the standalone Records screen has been removed.
 *
 * Shows: identity, online-only lifetime stats, best solo times, best
 * online times, and the online totals/averages aggregated across all
 * digit lengths. Solo runs deliberately never appear in the lifetime
 * stats — that surface is online-only by product spec.
 */
export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { t, lz, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";
  const [records, setRecords] = useState<Records>({ solo: {}, online: {} });
  const [onlineStats, setOnlineStats] = useState<OnlineStats>(DEFAULT_ONLINE_STATS);
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([getRecords(), getOnlineStats()]);
    setRecords(r);
    setOnlineStats(s);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const identity = formatPlayerIdentity(settings.playerName, settings.playerSerial);

  // Aggregate online totals across every digit length so we can surface
  // "Total online guesses" and "Avg online guesses" — required by spec.
  const totalGuesses = DIGITS_LIST.reduce(
    (sum, d) => sum + onlineStats.perDigit[d].totalGuessesWon,
    0,
  );
  const totalWins = onlineStats.wins;
  const avgGuesses =
    totalWins > 0 ? Math.round((totalGuesses / totalWins) * 10) / 10 : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("profile.title")} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionHeading, { color: colors.mutedForeground, writingDirection: wd }]}>
          {t("profile.identity")}
        </Text>
        <GlassCard style={styles.identityCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}>
            <Feather name="user" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }} {...({ dir: "ltr" } as object)}>
            <Text style={[styles.identityName, { color: colors.foreground }]} numberOfLines={1}>
              {settings.playerName || "—"}
            </Text>
            <Text style={[styles.identitySerial, { color: colors.mutedForeground }]} numberOfLines={1}>
              {identity || `#${settings.playerSerial || "00000"}`}
            </Text>
          </View>
        </GlassCard>

        <Text style={[styles.sectionHeading, { color: colors.mutedForeground, writingDirection: wd }]}>
          {t("profile.onlineStats")}
        </Text>
        <StatsOverview stats={onlineStats} />

        {/* Totals row — explicitly requested in the spec ("Total online
            guesses" + "Average online guesses"). Renders even with zero
            so the user can see the surface exists. */}
        <View style={styles.totalsRow}>
          <View style={[styles.totalCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="hash" size={14} color={colors.mutedForeground} />
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
              {t("stats.totalGuesses")}
            </Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              {lz(totalGuesses)}
            </Text>
          </View>
          <View style={[styles.totalCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="activity" size={14} color={colors.mutedForeground} />
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
              {t("stats.avgGuessesAll")}
            </Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              {avgGuesses != null ? lz(avgGuesses) : t("profile.noTime")}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: colors.mutedForeground, writingDirection: wd }]}>
          {t("profile.bestSoloTimes")}
        </Text>
        <BestTimesRow modeRecords={records.solo} lz={lz} t={t} />

        <Text style={[styles.sectionHeading, { color: colors.mutedForeground, writingDirection: wd }]}>
          {t("profile.bestOnlineTimes")}
        </Text>
        <BestTimesRow modeRecords={records.online} lz={lz} t={t} />
      </ScrollView>
    </View>
  );
}

function BestTimesRow({
  modeRecords,
  lz,
  t,
}: {
  modeRecords: ModeRecords;
  lz: (n: string | number) => string;
  t: (k: "records.label" | "profile.noTime", v?: Record<string, string | number>) => string;
}) {
  const colors = useColors();
  return (
    <View style={styles.timesRow}>
      {DIGITS_LIST.map((d) => {
        const r = modeRecords[d];
        return (
          <View
            key={d}
            style={[styles.timeCell, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>
              {t("records.label", { n: d })}
            </Text>
            <Text style={[styles.timeValue, { color: colors.foreground }]}>
              {r ? lz(formatTime(r.bestTimeSec)) : t("profile.noTime")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  sectionHeading: {
    fontSize: 12,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
    marginTop: 10,
    marginBottom: -4,
  },
  identityCard: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  identityName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  identitySerial: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  totalsRow: { flexDirection: "row", gap: 8 },
  totalCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  totalLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 },
  totalValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  timesRow: { flexDirection: "row", gap: 8 },
  timeCell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  timeLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  timeValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
});
