import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useT } from "@/src/i18n/useT";
import type { TranslationKey } from "@/src/i18n/translations";
import { webBottomInset } from "@/src/theme/theme";

/** Purple accent for the Punishments section per spec. */
const PUNISHMENT_PURPLE = "#a855f7";

export default function HowToPlayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lz, isRTL } = useT();
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;
  const wd = isRTL ? "rtl" : "ltr";

  const CardHead = ({
    icon, title, tint,
  }: {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    tint?: string;
  }) => {
    const accent = tint ?? colors.primary;
    const bg = tint ? tint + "22" : colors.secondary;
    return (
      <View style={styles.cardHead}>
        <View style={[styles.iconWrap, { backgroundColor: bg }]}>
          <Feather name={icon} size={18} color={accent} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}>
          {title}
        </Text>
      </View>
    );
  };

  const Card = ({
    children, tint,
  }: { children: React.ReactNode; tint?: string }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: tint ? tint + "44" : colors.border,
        },
      ]}
    >
      {children}
    </View>
  );

  const Bullet = ({ text, color }: { text: string; color?: string }) => (
    <View style={styles.bulletRow}>
      <View
        style={[
          styles.dot,
          { backgroundColor: color ?? colors.primary },
        ]}
      />
      <Text
        style={[
          styles.bulletText,
          { color: colors.foreground, writingDirection: wd },
        ]}
      >
        {text}
      </Text>
    </View>
  );

  const BodyText = ({ text }: { text: string }) => (
    <Text style={[styles.body, { color: colors.mutedForeground, writingDirection: wd }]}>
      {text}
    </Text>
  );

  const BulletList = ({ items, color }: { items: string[]; color?: string }) => (
    <View style={styles.bulletList}>
      {items.map((it, i) => (
        <Bullet key={i} text={it} color={color} />
      ))}
    </View>
  );

  const HintChip = ({ tKey, color }: { tKey: TranslationKey; color: string }) => (
    <View
      style={[
        styles.chip,
        { backgroundColor: color + "1a", borderColor: color + "55" },
      ]}
    >
      <Text style={[styles.chipText, { color, writingDirection: wd }]}>
        {t(tKey)}
      </Text>
    </View>
  );

  // One punishment card: tinted leading-edge border + tinted icon background.
  const PunishCard = ({
    icon, title, body, color,
  }: {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    body: string;
    color: string;
  }) => (
    <View
      style={[
        styles.punCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...(isRTL
            ? { borderRightColor: color, borderRightWidth: 4 }
            : { borderLeftColor: color, borderLeftWidth: 4 }),
        },
      ]}
    >
      <CardHead icon={icon} title={title} tint={color} />
      <BodyText text={body} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("howto.title")} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Goal */}
        <Card>
          <CardHead icon="target" title={t("howto.goal")} />
          <BodyText text={t("howto.goalText")} />
        </Card>

        {/* Gameplay */}
        <Card>
          <CardHead icon="play-circle" title={t("howto.gameplay.title")} />
          <BulletList
            items={[
              t("howto.gameplay.b1"),
              t("howto.gameplay.b2"),
              t("howto.gameplay.b3"),
            ]}
          />
        </Card>

        {/* Hints — verdict labels */}
        <Card>
          <CardHead icon="message-circle" title={t("howto.hints.title")} />
          <BodyText text={t("howto.hints.intro")} />
          <View style={styles.chipRow}>
            <HintChip tKey="howto.hints.low" color={colors.success} />
            <HintChip tKey="howto.hints.high" color={colors.success} />
            <HintChip tKey="howto.hints.tooLow" color={colors.destructive} />
            <HintChip tKey="howto.hints.tooHigh" color={colors.destructive} />
          </View>
        </Card>

        {/* Hint rules per digit count */}
        <Card>
          <CardHead icon="sliders" title={t("howto.hints.rulesTitle")} />
          <BulletList
            items={[
              t("howto.hints.d2"),
              t("howto.hints.d3"),
              t("howto.hints.d4"),
            ]}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BodyText text={t("howto.hints.correctCount")} />
        </Card>

        {/* Example */}
        <Card>
          <CardHead icon="book-open" title={t("howto.example.title")} />
          <View style={styles.exampleRows}>
            <ExampleRow
              label={t("howto.example.correctLabel")}
              value={lz("369")}
              valueColor={colors.success}
            />
            <ExampleRow
              label={t("howto.example.guessLabel")}
              value={lz("349")}
              valueColor={colors.foreground}
            />
            <ExampleRow
              label={t("howto.example.feedbackLabel")}
              value={t("howto.example.feedbackBody")}
              isText
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BodyText text={t("howto.example.note")} />
        </Card>

        {/* Winning */}
        <Card>
          <CardHead icon="award" title={t("howto.win.title")} />
          <BodyText text={t("howto.win.body")} />
        </Card>

        {/* Solo */}
        <Card>
          <CardHead icon="clock" title={t("howto.solo")} />
          <BulletList
            items={[
              t("howto.solo.b1"),
              t("howto.solo.b2"),
              t("howto.solo.b3"),
            ]}
          />
        </Card>

        {/* Online (Multiplayer) */}
        <Card>
          <CardHead icon="users" title={t("howto.mp")} />
          <BulletList
            items={[
              t("howto.mp.b1"),
              t("howto.mp.b2"),
              t("howto.mp.b3"),
            ]}
          />
        </Card>

        {/* Punishments header */}
        <View
          style={[
            styles.sectionHeader,
            { backgroundColor: PUNISHMENT_PURPLE + "18", borderColor: PUNISHMENT_PURPLE + "55" },
          ]}
        >
          <View style={styles.cardHead}>
            <View style={[styles.iconWrap, { backgroundColor: PUNISHMENT_PURPLE + "33" }]}>
              <Feather name="alert-octagon" size={18} color={PUNISHMENT_PURPLE} />
            </View>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.foreground, writingDirection: wd },
              ]}
            >
              {t("howto.pun.section")}
            </Text>
          </View>
          <BodyText text={t("howto.pun.intro")} />
        </View>

        {/* By player count */}
        <Card tint={PUNISHMENT_PURPLE}>
          <CardHead icon="users" title={t("howto.pun.byCount")} tint={PUNISHMENT_PURPLE} />
          <BulletList
            color={PUNISHMENT_PURPLE}
            items={[t("howto.pun.count3"), t("howto.pun.count4")]}
          />
        </Card>

        <Text
          style={[
            styles.subHeader,
            { color: colors.mutedForeground, writingDirection: wd },
          ]}
        >
          {t("howto.pun.cardsHeader")}
        </Text>

        <PunishCard
          icon="x-circle"
          title={t("howto.pun.directElim.title")}
          body={t("howto.pun.directElim.body")}
          color={colors.destructive}
        />
        <PunishCard
          icon="heart"
          title={t("howto.pun.forgive.title")}
          body={t("howto.pun.forgive.body")}
          color={colors.success}
        />
        <PunishCard
          icon="check-square"
          title={t("howto.pun.vote.title")}
          body={t("howto.pun.vote.body")}
          color={colors.success}
        />
        <PunishCard
          icon="repeat"
          title={t("howto.pun.chooseAnother.title")}
          body={t("howto.pun.chooseAnother.body")}
          color={colors.success}
        />

        {/* How a punishment is chosen */}
        <Card tint={PUNISHMENT_PURPLE}>
          <CardHead
            icon="target"
            title={t("howto.pun.selection.title")}
            tint={PUNISHMENT_PURPLE}
          />
          <BulletList
            color={PUNISHMENT_PURPLE}
            items={[t("howto.pun.selection.b1"), t("howto.pun.selection.b2")]}
          />
        </Card>

        {/* Redirect rule */}
        <Card tint={PUNISHMENT_PURPLE}>
          <CardHead
            icon="info"
            title={t("howto.pun.redirect.title")}
            tint={PUNISHMENT_PURPLE}
          />
          <BodyText text={t("howto.pun.redirect.body")} />
        </Card>

        {/* Second-draw chances after redirect */}
        <Card tint={PUNISHMENT_PURPLE}>
          <CardHead
            icon="users"
            title={t("howto.pun.odds2.title")}
            tint={PUNISHMENT_PURPLE}
          />
          <BulletList
            color={PUNISHMENT_PURPLE}
            items={[t("howto.pun.odds2.count3"), t("howto.pun.odds2.count4")]}
          />
        </Card>

        {/* Important */}
        <Card tint={PUNISHMENT_PURPLE}>
          <CardHead
            icon="info"
            title={t("howto.important.title")}
            tint={PUNISHMENT_PURPLE}
          />
          <BulletList
            color={PUNISHMENT_PURPLE}
            items={[
              t("howto.important.b1"),
              t("howto.important.b2"),
              t("howto.important.b3"),
            ]}
          />
        </Card>
      </ScrollView>
    </View>
  );

  function ExampleRow({
    label, value, valueColor, isText,
  }: {
    label: string;
    value: string;
    valueColor?: string;
    isText?: boolean;
  }) {
    return (
      <View style={styles.exRow}>
        <Text style={[styles.exLabel, { color: colors.mutedForeground, writingDirection: wd }]}>
          {label}
        </Text>
        <Text
          style={[
            isText ? styles.exText : styles.exMono,
            { color: valueColor ?? colors.foreground, writingDirection: isText ? wd : "ltr" },
          ]}
        >
          {value}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  card: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flexShrink: 1 },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },

  bulletList: { gap: 8 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  bulletText: {
    fontSize: 14, fontFamily: "Inter_500Medium", flexShrink: 1, lineHeight: 21,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },

  exampleRows: { gap: 10 },
  exRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  exLabel: { fontSize: 13, fontFamily: "Inter_500Medium", flexShrink: 1 },
  exMono: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1.2,
  },
  exText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
    textAlign: "right",
  },

  sectionHeader: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flexShrink: 1 },
  subHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
    marginHorizontal: 4,
  },
  punCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
});
