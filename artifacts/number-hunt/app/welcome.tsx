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
import {
  formatPlayerIdentity,
  generateSerial,
  type Language,
} from "@/src/storage/storage";
import { webBottomInset, webTopInset } from "@/src/theme/theme";

/**
 * First-launch onboarding. The player picks a nickname and a language;
 * the system pairs the nickname with an auto-generated 5-digit serial
 * that they cannot edit. The combined identity ("Ahmed #48291") is what
 * shows everywhere — solo records, online rooms, stats.
 */
export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const { t, isRTL } = useT();
  const writingDirection = isRTL ? "rtl" : "ltr";

  const initialSerial = useMemo(
    () => settings.playerSerial || generateSerial(),
    [settings.playerSerial],
  );
  const [serial] = useState<string>(initialSerial);
  const [name, setName] = useState<string>(settings.playerName);
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const canContinue = trimmed.length > 0 && !busy;
  const previewIdentity = formatPlayerIdentity(trimmed, serial);

  const topPad = (Platform.OS === "web" ? webTopInset() : insets.top) + 24;
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const onContinue = async () => {
    if (!canContinue) return;
    setBusy(true);
    await update({
      playerName: trimmed.slice(0, 24),
      playerSerial: serial,
      hasOnboarded: true,
    });
    router.replace("/");
  };

  const langOptions: { value: Language; label: string }[] = [
    { value: "en", label: "English" },
    { value: "ar", label: "العربية" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientSoftFrom, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        {/* Top bar — quick access to the full settings screen and an
            inline language toggle. Switching language re-renders the
            screen instantly and persists via AsyncStorage. */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            accessibilityLabel={t("welcome.openSettings")}
          >
            <View style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="settings" size={18} color={colors.foreground} />
            </View>
          </Pressable>
          <View style={[styles.langPicker, { backgroundColor: colors.muted }]}>
            {langOptions.map((o) => {
              const active = settings.language === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => void update({ language: o.value })}
                  style={[
                    styles.langItem,
                    { backgroundColor: active ? colors.card : "transparent" },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.langText,
                      { color: active ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
          </View>

          <View
            style={[
              styles.previewCard,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
            {...({ dir: "ltr" } as object)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>
                {t("welcome.identityPreview")}
              </Text>
              <View style={styles.previewRow}>
                <Text
                  style={[
                    styles.previewName,
                    { color: trimmed ? colors.foreground : colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {trimmed || t("welcome.nicknamePh")}
                </Text>
                <View style={[styles.serialChip, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                  <Feather name="hash" size={11} color={colors.primary} />
                  <Text style={[styles.serialText, { color: colors.primary }]}>
                    {serial}
                  </Text>
                </View>
              </View>
              {previewIdentity ? (
                <Text style={[styles.previewFull, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {previewIdentity}
                </Text>
              ) : null}
            </View>
          </View>

          <Text style={[styles.hint, { color: colors.mutedForeground, writingDirection }]}>
            {t("welcome.hint")}
          </Text>
          {!canContinue && trimmed.length === 0 ? (
            <Text
              style={[styles.warn, { color: colors.destructive, writingDirection }]}
            >
              {t("welcome.nicknameRequired")}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            title={t("welcome.continue")}
            fullWidth
            size="lg"
            disabled={!canContinue}
            loading={busy}
            onPress={() => void onContinue()}
          />
        </View>
      </View>
    </View>
  );
}

void Pressable;

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between", gap: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  langPicker: { flexDirection: "row", padding: 3, borderRadius: 10 },
  langItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  langText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  hero: { alignItems: "center", gap: 12 },
  iconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 340,
  },
  form: { gap: 10 },
  label: { fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_700Bold", paddingHorizontal: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  previewLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  previewName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    maxWidth: "65%",
  },
  serialChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  serialText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  previewFull: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
    opacity: 0.7,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 4,
    lineHeight: 17,
  },
  warn: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 4,
  },
  actions: { gap: 10 },
});
