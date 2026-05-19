import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/src/components/GlassCard";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useT } from "@/src/i18n/useT";
import {
  ACHIEVEMENTS,
  TIER_ORDER,
  type AchievementDef,
  type AchievementTier,
  type AchievementTone,
} from "@/src/achievements/catalog";
import {
  getAchievements,
  getStats,
  type Achievements,
  type Stats,
  createDefaultStats,
} from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";
import { formatDate } from "@/src/utils/scoring";
import type { TranslationKey } from "@/src/i18n/translations";

const TIER_COLORS: Readonly<Record<AchievementTier, string>> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  diamond: "#5BE0E6",
  legendary: "#B084F5",
};

const TIER_LABEL_KEYS: Readonly<Record<AchievementTier, TranslationKey>> = {
  bronze: "ach.tier.bronze",
  silver: "ach.tier.silver",
  gold: "ach.tier.gold",
  diamond: "ach.tier.diamond",
  legendary: "ach.tier.legendary",
};

export default function AchievementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";
  const [data, setData] = useState<Achievements>({ unlockedIds: [], unlockedAt: {} });
  const [stats, setStats] = useState<Stats>(createDefaultStats());
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const load = useCallback(async () => {
    const [a, s] = await Promise.all([getAchievements(), getStats()]);
    setData(a);
    setStats(s);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const unlockedSet = new Set(data.unlockedIds);
  const total = ACHIEVEMENTS.length;
  const unlockedCount = data.unlockedIds.length;

  // Group catalog entries by tier so the screen renders Bronze → Legendary
  // sections, each with its own header and unlocked-count badge.
  const byTier: Record<AchievementTier, AchievementDef[]> = {
    bronze: [],
    silver: [],
    gold: [],
    diamond: [],
    legendary: [],
  };
  for (const def of ACHIEVEMENTS) byTier[def.tier].push(def);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("ach.title")} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard tone="primary" style={styles.summary}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="award" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryHead, { color: colors.mutedForeground, writingDirection: wd }]}>
              {t("ach.progress")}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {unlockedCount} / {total}
            </Text>
          </View>
        </GlassCard>

        {unlockedCount === 0 ? (
          <Text style={[styles.emptyHint, { color: colors.mutedForeground, writingDirection: wd }]}>
            {t("ach.empty")}
          </Text>
        ) : null}

        {TIER_ORDER.map((tier) => {
          const defs = byTier[tier];
          if (defs.length === 0) return null;
          const tierUnlocked = defs.filter((d) => unlockedSet.has(d.id)).length;
          const tierColor = TIER_COLORS[tier];
          return (
            <View key={tier} style={styles.tierSection}>
              <View
                style={[
                  styles.tierHeader,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <View
                  style={[
                    styles.tierDot,
                    { backgroundColor: tierColor },
                  ]}
                />
                <Text
                  style={[
                    styles.tierLabel,
                    { color: tierColor, writingDirection: wd },
                  ]}
                >
                  {t(TIER_LABEL_KEYS[tier])}
                </Text>
                <View style={{ flex: 1 }} />
                <Text
                  style={[
                    styles.tierCount,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {tierUnlocked} / {defs.length}
                </Text>
              </View>
              <View style={styles.list}>
                {defs.map((def) => {
                  const unlocked = unlockedSet.has(def.id);
                  const at = data.unlockedAt[def.id];
                  const progress =
                    !unlocked && def.progress ? def.progress(stats) : null;
                  return (
                    <BadgeRow
                      key={def.id}
                      def={def}
                      unlocked={unlocked}
                      unlockedAtISO={at}
                      progress={progress}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function BadgeRow({
  def,
  unlocked,
  unlockedAtISO,
  progress,
}: {
  def: AchievementDef;
  unlocked: boolean;
  unlockedAtISO: string | undefined;
  progress: { current: number; target: number } | null;
}) {
  const colors = useColors();
  const { t, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";
  const tone = toneToColor(def.tone, colors);
  const tierColor = TIER_COLORS[def.tier];

  return (
    <GlassCard style={styles.row} tone="neutral">
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: unlocked ? tone + "22" : colors.muted,
            borderColor: unlocked ? tierColor : "transparent",
            borderWidth: unlocked ? 1.5 : 0,
          },
        ]}
      >
        <Feather
          name={unlocked ? def.icon : "lock"}
          size={22}
          color={unlocked ? tone : colors.mutedForeground}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[
            styles.title,
            { color: unlocked ? colors.foreground : colors.mutedForeground, writingDirection: wd },
          ]}
          numberOfLines={1}
        >
          {t(def.titleKey)}
        </Text>
        <Text
          style={[styles.desc, { color: colors.mutedForeground, writingDirection: wd }]}
          numberOfLines={2}
        >
          {t(def.descKey)}
        </Text>
        {unlocked && unlockedAtISO ? (
          <Text style={[styles.meta, { color: tierColor, writingDirection: wd }]}>
            {t("ach.unlockedOn", { date: formatDate(unlockedAtISO) })}
          </Text>
        ) : null}
        {!unlocked && progress ? (
          <ProgressBar
            current={progress.current}
            target={progress.target}
            color={tierColor}
            mutedColor={colors.muted}
            textColor={colors.mutedForeground}
            isRTL={isRTL}
          />
        ) : null}
      </View>
    </GlassCard>
  );
}

/**
 * Compact progress bar for locked achievements. Tabular-nums keeps the
 * "X / Y" label stable across digit changes, and the bar fills up to 100%.
 */
function ProgressBar({
  current,
  target,
  color,
  mutedColor,
  textColor,
  isRTL,
}: {
  current: number;
  target: number;
  color: string;
  mutedColor: string;
  textColor: string;
  isRTL: boolean;
}) {
  const pct = target > 0 ? Math.min(1, Math.max(0, current / target)) : 0;
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: mutedColor }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${pct * 100}%`,
              backgroundColor: color,
              alignSelf: isRTL ? "flex-end" : "flex-start",
            },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: textColor }]}>
        {current} / {target}
      </Text>
    </View>
  );
}

function toneToColor(
  tone: AchievementTone,
  colors: ReturnType<typeof useColors>,
): string {
  switch (tone) {
    case "success":
      return colors.success;
    case "warning":
      return colors.warning;
    case "danger":
      return colors.destructive;
    case "accent":
      return colors.accent;
    case "primary":
    default:
      return colors.primary;
  }
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  summary: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryHead: { fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  emptyHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 4,
    lineHeight: 19,
  },
  tierSection: { gap: 10 },
  tierHeader: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierLabel: {
    fontSize: 12,
    letterSpacing: 1.4,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  tierCount: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  list: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  meta: { marginTop: 4, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  progressWrap: { marginTop: 6, gap: 4 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
});
