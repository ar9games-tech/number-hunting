import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { webBottomInset } from "@/src/theme/theme";

export default function HowToPlayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="How to Play" />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Block icon="target" title="The goal">
          A hidden number is chosen with the length you select (2, 3, or 4 digits). Crack it
          in as few guesses — and as fast — as you can.
        </Block>
        <Block icon="message-circle" title="Feedback">
          Each guess is rated by how far it is from the hidden number:
          {"\n\n"}• Within range → "Low" or "High"
          {"\n"}• Far away → "Too Low" or "Too High"
          {"\n"}• Exact match → "Correct!"
          {"\n\n"}Range depends on difficulty: 2-digit ±10, 3-digit ±50, 4-digit ±200.
          For 3 and 4-digit modes you'll also see how many of your digits appear in the
          hidden number — but never which ones or where.
        </Block>
        <ExampleBlock />
        <Block icon="clock" title="Solo Mode">
          A timer starts as soon as the round begins. There is no guess limit — beat your
          best time and earn a record.
        </Block>
        <Block icon="users" title="Multiplayer Mode">
          Create a room and share the code. The host sets a hidden number, the guesser
          tries to crack it. Switch roles after each round. No timer, no limits.
        </Block>
      </ScrollView>
    </View>
  );

  function Block({
    icon,
    title,
    children,
  }: {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.cardHead}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name={icon} size={18} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{children}</Text>
      </View>
    );
  }

  function ExampleBlock() {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.cardHead}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="book-open" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Examples</Text>
        </View>
        <View style={styles.examples}>
          <ExampleRow hidden="482" guess="250" verdict="Too Low — 1 correct digit" />
          <ExampleRow hidden="482" guess="500" verdict="High — 0 correct digits" />
          <ExampleRow hidden="482" guess="480" verdict="Low — 2 correct digits" />
          <ExampleRow hidden="482" guess="482" verdict="Correct!" />
        </View>
      </View>
    );
  }

  function ExampleRow({
    hidden,
    guess,
    verdict,
  }: {
    hidden: string;
    guess: string;
    verdict: string;
  }) {
    return (
      <View style={[styles.exRow, { borderColor: colors.border }]}>
        <Text style={[styles.exMono, { color: colors.foreground }]}>
          Hidden {hidden} · Guess {guess}
        </Text>
        <Text style={[styles.exVerdict, { color: colors.mutedForeground }]}>{verdict}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  examples: {
    gap: 8,
  },
  exRow: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  exMono: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.6,
  },
  exVerdict: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
