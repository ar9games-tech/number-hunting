import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import { generatePlayerSerial } from "@/src/storage/storage";
import { webBottomInset, webTopInset } from "@/src/theme/theme";

/**
 * First-launch screen. The system auto-generates a "Player #1234" style
 * serial; the user can keep it as-is or type their own nickname before
 * tapping Continue. Setting hasOnboarded=true prevents this screen from
 * showing again unless the user does Settings → Reset All.
 */
export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const { t, isRTL } = useT();
  const writingDirection = isRTL ? "rtl" : "ltr";

  // Compute the initial value once per mount: keep any existing name, or
  // generate a fresh serial. The serial prefix is localized.
  const initial = useMemo(() => {
    if (settings.playerName.trim()) return settings.playerName;
    return generatePlayerSerial(t("welcome.serialPrefix"));
  }, [settings.playerName, t]);

  const [name, setName] = useState<string>(initial);
  const [busy, setBusy] = useState(false);

  const topPad = (Platform.OS === "web" ? webTopInset() : insets.top) + 48;
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const onContinue = async () => {
    if (busy) return;
    setBusy(true);
    const trimmed = name.trim().slice(0, 24);
    // If the user wiped the field, fall back to a fresh serial so we
    // never persist an empty name.
    const final = trimmed.length > 0 ? trimmed : generatePlayerSerial(t("welcome.serialPrefix"));
    await update({ playerName: final, hasOnboarded: true });
    router.replace("/");
  };

  const onRegenerate = () => {
    setName(generatePlayerSerial(t("welcome.serialPrefix")));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientSoftFrom, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.hero}>
          <View style={[styles.iconRing, { borderColor: colors.primary }]}>
            <Feather name="user" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground, writingDirection }]}>
            {t("welcome.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, writingDirection }]}>
            {t("welcome.subtitle")}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.mutedForeground, writingDirection }]}>
            {t("welcome.nickname")}
          </Text>
          <View
            style={[
              styles.inputRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              value={name}
              onChangeText={(v) => setName(v.slice(0, 24))}
              placeholder={t("welcome.nicknamePh")}
              placeholderTextColor={colors.mutedForeground}
              autoFocus={Platform.OS === "web"}
              maxLength={24}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  writingDirection,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
              returnKeyType="done"
              onSubmitEditing={() => void onContinue()}
            />
            <Pressable
              onPress={onRegenerate}
              hitSlop={10}
              style={[styles.regen, { backgroundColor: colors.muted }]}
              accessibilityLabel={t("welcome.regenerate")}
            >
              <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground, writingDirection }]}>
            {t("welcome.hint")}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title={t("welcome.continue")}
            fullWidth
            size="lg"
            onPress={() => void onContinue()}
            loading={busy}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between", gap: 24 },
  hero: { alignItems: "center", gap: 14 },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 340,
  },
  form: { gap: 8 },
  label: { fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_700Bold", paddingHorizontal: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  regen: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 4,
    lineHeight: 17,
  },
  actions: { gap: 10 },
});
