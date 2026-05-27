import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { webBottomInset } from "@/src/theme/theme";

const SUPPORT_EMAIL = "Ayed_n4@hotmail.com";
const APP_NAME = "Number Hunting";

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad =
    (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const openEmail = () => {
    const subject = encodeURIComponent(`${APP_NAME} — Support request`);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(
      () => {},
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Support" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View
            style={[styles.iconCircle, { backgroundColor: colors.secondary }]}
          >
            <Feather name="life-buoy" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {APP_NAME} Support
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We're here to help. Reach out any time and we'll get back to you
            as soon as we can.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
            CONTACT
          </Text>
          <Text style={[styles.cardValue, { color: colors.foreground }]}>
            {SUPPORT_EMAIL}
          </Text>
          <Pressable
            onPress={openEmail}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="mail" size={16} color={colors.primaryForeground} />
            <Text
              style={[styles.buttonText, { color: colors.primaryForeground }]}
            >
              Email support
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
            COMMON QUESTIONS
          </Text>

          <Text style={[styles.qTitle, { color: colors.foreground }]}>
            How do I play?
          </Text>
          <Text style={[styles.qBody, { color: colors.mutedForeground }]}>
            Open the app, tap "How to Play" from the home screen for a full
            walkthrough of the rules, feedback chips, and punishments.
          </Text>

          <Text style={[styles.qTitle, { color: colors.foreground }]}>
            I found a bug or my game isn't working.
          </Text>
          <Text style={[styles.qBody, { color: colors.mutedForeground }]}>
            Please email us with your device model, iOS version, and a short
            description of what happened. Screenshots help a lot.
          </Text>

          <Text style={[styles.qTitle, { color: colors.foreground }]}>
            Account & data
          </Text>
          <Text style={[styles.qBody, { color: colors.mutedForeground }]}>
            {APP_NAME} does not require an account. Your game history and
            settings are stored locally on your device.
          </Text>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Response time is usually within 2 business days.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  hero: { alignItems: "center", gap: 10, paddingVertical: 16 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Inter_600SemiBold",
  },
  cardValue: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  button: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  qTitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  qBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
});
