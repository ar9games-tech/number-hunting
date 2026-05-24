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

  const Block = ({
    icon, title, body,
  }: {
    icon: keyof typeof Feather.glyphMap; title: string; body: string;
  }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHead}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.body, { color: colors.mutedForeground, writingDirection: wd }]}>
        {body}
      </Text>
    </View>
  );

  // One punishment card: tinted left border + circular icon background using
  // the highlight color per spec (red for elimination, green for the
  // non-elimination cards, purple for vote/chooseAnother section accents).
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
          // Highlight the leading edge so the accent stays on the
          // text-start side in both LTR (left) and RTL (right) layouts.
          ...(isRTL
            ? { borderRightColor: color, borderRightWidth: 4 }
            : { borderLeftColor: color, borderLeftWidth: 4 }),
        },
      ]}
    >
      <View style={styles.cardHead}>
        <View style={[styles.iconWrap, { backgroundColor: color + "22" }]}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.body, { color: colors.mutedForeground, writingDirection: wd }]}>
        {body}
      </Text>
    </View>
  );

  const CountRow = ({ tKey }: { tKey: TranslationKey }) => (
    <View style={styles.countRow}>
      <View style={[styles.bullet, { backgroundColor: PUNISHMENT_PURPLE }]} />
      <Text
        style={[styles.countText, { color: colors.foreground, writingDirection: wd }]}
      >
        {t(tKey)}
      </Text>
    </View>
  );

  const NoteRow = ({ tKey }: { tKey: TranslationKey }) => (
    <View style={styles.noteRow}>
      <Feather
        name="info"
        size={14}
        color={colors.mutedForeground}
        style={{ marginTop: 3 }}
      />
      <Text
        style={[styles.noteText, { color: colors.mutedForeground, writingDirection: wd }]}
      >
        {t(tKey)}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("howto.title")} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Block icon="target" title={t("howto.goal")} body={t("howto.goalText")} />
        <Block icon="message-circle" title={t("howto.feedback")} body={t("howto.feedbackText")} />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHead}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="book-open" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}>
              {t("howto.examples")}
            </Text>
          </View>
          <View style={styles.examples}>
            <ExampleRow hidden="482" guess="250" verdict={`${t("fb.tooLow")} — ${t("fb.correctDigit", { n: 1 })}`} />
            <ExampleRow hidden="482" guess="500" verdict={`${t("fb.high")} — ${t("fb.correctDigits", { n: 0 })}`} />
            <ExampleRow hidden="482" guess="480" verdict={`${t("fb.low")} — ${t("fb.correctDigits", { n: 2 })}`} />
            <ExampleRow hidden="482" guess="482" verdict={t("fb.correct")} />
          </View>
        </View>

        <Block icon="clock" title={t("howto.solo")} body={t("howto.soloText")} />
        <Block icon="users" title={t("howto.mp")} body={t("howto.mpText")} />

        {/* Punishments — placed right after the Multiplayer block per spec. */}
        <View
          style={[
            styles.sectionHeader,
            { backgroundColor: PUNISHMENT_PURPLE + "18", borderColor: PUNISHMENT_PURPLE + "55" },
          ]}
        >
          <View style={styles.cardHead}>
            <View style={[styles.iconWrap, { backgroundColor: PUNISHMENT_PURPLE + "33" }]}>
              <Feather name="award" size={18} color={PUNISHMENT_PURPLE} />
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
          <Text
            style={[styles.body, { color: colors.mutedForeground, writingDirection: wd }]}
          >
            {t("howto.pun.intro")}
          </Text>
        </View>

        <View
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.cardHead}>
            <View
              style={[styles.iconWrap, { backgroundColor: PUNISHMENT_PURPLE + "22" }]}
            >
              <Feather name="users" size={18} color={PUNISHMENT_PURPLE} />
            </View>
            <Text
              style={[
                styles.cardTitle,
                { color: colors.foreground, writingDirection: wd },
              ]}
            >
              {t("howto.pun.byCount")}
            </Text>
          </View>
          <View style={styles.counts}>
            <CountRow tKey="howto.pun.count3" />
            <CountRow tKey="howto.pun.count4" />
          </View>
        </View>

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

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHead}>
            <View
              style={[styles.iconWrap, { backgroundColor: PUNISHMENT_PURPLE + "22" }]}
            >
              <Feather name="info" size={18} color={PUNISHMENT_PURPLE} />
            </View>
            <Text
              style={[
                styles.cardTitle,
                { color: colors.foreground, writingDirection: wd },
              ]}
            >
              {t("howto.pun.notesHeader")}
            </Text>
          </View>
          <View style={styles.notes}>
            <NoteRow tKey="howto.pun.note1" />
            <NoteRow tKey="howto.pun.note2" />
            <NoteRow tKey="howto.pun.note3" />
            <NoteRow tKey="howto.pun.note4" />
          </View>
        </View>
      </ScrollView>
    </View>
  );

  function ExampleRow({
    hidden, guess, verdict,
  }: { hidden: string; guess: string; verdict: string }) {
    return (
      <View style={[styles.exRow, { borderColor: colors.border }]}>
        <Text style={[styles.exMono, { color: colors.foreground, writingDirection: wd }]}>
          {lz(hidden)} · {lz(guess)}
        </Text>
        <Text style={[styles.exVerdict, { color: colors.mutedForeground, writingDirection: wd }]}>
          {verdict}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  card: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flexShrink: 1 },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  examples: { gap: 8 },
  exRow: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  exMono: {
    fontSize: 14, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"], letterSpacing: 0.6,
  },
  exVerdict: { marginTop: 2, fontSize: 13, fontFamily: "Inter_500Medium" },
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
  counts: { gap: 8 },
  countRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  countText: { fontSize: 14, fontFamily: "Inter_500Medium", flexShrink: 1, lineHeight: 20 },
  notes: { gap: 8 },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteText: { fontSize: 13, fontFamily: "Inter_400Regular", flexShrink: 1, lineHeight: 19 },
});
