import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useT } from "@/src/i18n/useT";
import { webBottomInset } from "@/src/theme/theme";

export default function HowToPlayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useT();
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
      </ScrollView>
    </View>
  );

  function ExampleRow({
    hidden, guess, verdict,
  }: { hidden: string; guess: string; verdict: string }) {
    return (
      <View style={[styles.exRow, { borderColor: colors.border }]}>
        <Text style={[styles.exMono, { color: colors.foreground, writingDirection: wd }]}>
          {hidden} · {guess}
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
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  examples: { gap: 8 },
  exRow: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  exMono: {
    fontSize: 14, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"], letterSpacing: 0.6,
  },
  exVerdict: { marginTop: 2, fontSize: 13, fontFamily: "Inter_500Medium" },
});
