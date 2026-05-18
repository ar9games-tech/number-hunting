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
  type AchievementDef,
  type AchievementTone,
} from "@/src/achievements/catalog";
import { getAchievements, type Achievements } from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";
import { formatDate } from "@/src/utils/scoring";

export default function AchievementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";
  const [data, setData] = useState<Achievements>({ unlockedIds: [], unlockedAt: {} });
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const load = useCallback(async () => {
    setData(await getAchievements());
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const unlockedSet = new Set(data.unlockedIds);
  const total = ACHIEVEMENTS.length;
  const unlockedCount = data.unlockedIds.length;

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

        <View style={styles.list}>
          {ACHIEVEMENTS.map((def) => {
            const unlocked = unlockedSet.has(def.id);
            const at = data.unlockedAt[def.id];
            return (
              <BadgeRow
                key={def.id}
                def={def}
                unlocked={unlocked}
                unlockedAtISO={at}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function BadgeRow({
  def,
  unlocked,
  unlockedAtISO,
}: {
  def: AchievementDef;
  unlocked: boolean;
  unlockedAtISO: string | undefined;
}) {
  const colors = useColors();
  const { t, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";
  const tone = toneToColor(def.tone, colors);

  return (
    <GlassCard style={styles.row} tone={unlocked ? "neutral" : "neutral"}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: unlocked ? tone + "22" : colors.muted,
            // Subtle ring on unlocked badges so they "pop" against the
            // grayscale locked ones.
            borderColor: unlocked ? tone : "transparent",
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
          <Text style={[styles.meta, { color: tone, writingDirection: wd }]}>
            {t("ach.unlockedOn", { date: formatDate(unlockedAtISO) })}
          </Text>
        ) : null}
      </View>
    </GlassCard>
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
});
