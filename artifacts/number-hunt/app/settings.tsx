import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import { clearOnlineStats, clearRecords, type Language, type ThemeMode } from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, update, resetAll } = useSettings();
  const { t, isRTL } = useT();
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;
  const writingDirection = isRTL ? "rtl" : "ltr";

  const onResetAll = () => {
    Alert.alert(t("settings.resetAll"), t("settings.resetAllConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.reset"), style: "destructive", onPress: () => void resetAll() },
    ]);
  };

  // Reset Profile clears nickname + serial + onboarded flag so the next
  // launch (or this immediate redirect) shows the welcome screen again.
  // It deliberately leaves stats / records / achievements intact.
  // Reset Records wipes the per-mode best-time snapshots AND the online
  // lifetime stats surface (shown on Records / Profile). Leaves profile,
  // settings, and unlocked achievements intact — those are separate data.
  const onResetRecords = () => {
    Alert.alert(t("settings.resetRecords"), t("settings.resetRecordsMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.reset"),
        style: "destructive",
        onPress: async () => {
          // Mirror Records screen: wipe best times + the user-visible
          // online lifetime stats. Internal stats (used for achievement
          // progression) are deliberately preserved.
          await Promise.all([clearRecords(), clearOnlineStats()]);
        },
      },
    ]);
  };

  const onResetProfile = () => {
    Alert.alert(t("settings.resetProfile"), t("settings.resetProfileMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.reset"),
        style: "destructive",
        onPress: async () => {
          await update({ playerName: "", playerSerial: "", hasOnboarded: false });
          router.replace("/welcome");
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("settings.title")} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Section title={t("settings.profile")}>
          <Row label={t("settings.playerName")} icon="user">
            <TextInput
              value={settings.playerName}
              onChangeText={(v) => void update({ playerName: v.slice(0, 24) })}
              placeholder={t("settings.playerPh")}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  textAlign: isRTL ? "left" : "right",
                  writingDirection,
                },
              ]}
            />
          </Row>
          <Row label={t("settings.serial")} icon="hash">
            <View style={[styles.serialChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.serialText, { color: colors.foreground }]} numberOfLines={1}>
                #{settings.playerSerial || "—"}
              </Text>
            </View>
          </Row>
        </Section>

        <Section title={t("settings.appearance")}>
          <Row label={t("settings.theme")} icon="moon">
            <Segmented<ThemeMode>
              value={settings.themeMode}
              options={[
                { value: "system", label: t("settings.themeSystem") },
                { value: "light", label: t("settings.themeLight") },
                { value: "dark", label: t("settings.themeDark") },
              ]}
              onChange={(v) => void update({ themeMode: v })}
            />
          </Row>
          <Row label={t("settings.language")} icon="globe">
            <Segmented<Language>
              value={settings.language}
              options={[
                { value: "en", label: "English" },
                { value: "ar", label: "العربية" },
              ]}
              onChange={(v) => void update({ language: v })}
            />
          </Row>
        </Section>

        <Section title={t("settings.gameplay")}>
          <Row label={t("settings.allowLeading")} icon="hash">
            <Switch
              value={settings.allowLeadingZero}
              onValueChange={(v) => void update({ allowLeadingZero: v })}
              trackColor={{ true: colors.primary }}
            />
          </Row>
          <Row label={t("settings.haptics")} icon="zap">
            <Switch
              value={settings.hapticsOn}
              onValueChange={(v) => void update({ hapticsOn: v })}
              trackColor={{ true: colors.primary }}
            />
          </Row>
          {/* Sound row: icon flips between volume-2 / volume-x to mirror
              the toggle state, so the visual matches the switch even at
              a glance. */}
          <Row
            label={t("settings.sound")}
            icon={settings.soundOn ? "volume-2" : "volume-x"}
          >
            <Switch
              value={settings.soundOn}
              onValueChange={(v) => void update({ soundOn: v })}
              trackColor={{ true: colors.primary }}
              accessibilityLabel={
                settings.soundOn
                  ? t("settings.soundOnA11y")
                  : t("settings.soundOffA11y")
              }
            />
          </Row>
          <Row label={t("settings.reactions")} icon="smile">
            <Switch
              value={settings.enableReactions}
              onValueChange={(v) => void update({ enableReactions: v })}
              trackColor={{ true: colors.primary }}
              accessibilityLabel={
                settings.enableReactions
                  ? t("settings.reactionsOnA11y")
                  : t("settings.reactionsOffA11y")
              }
            />
          </Row>
        </Section>

        <Button
          title={t("settings.resetRecords")}
          variant="secondary"
          fullWidth
          onPress={onResetRecords}
        />
        <Button
          title={t("settings.resetProfile")}
          variant="secondary"
          fullWidth
          onPress={onResetProfile}
        />
        <Button
          title={t("settings.resetAll")}
          variant="ghost"
          fullWidth
          onPress={onResetAll}
        />

        <Text style={[styles.note, { color: colors.mutedForeground, writingDirection }]}>
          {t("settings.note")}
        </Text>
        <Text style={[styles.note, { color: colors.mutedForeground, writingDirection }]}>
          {t("settings.rtlNote")}
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  const { isRTL } = useT();
  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.mutedForeground, writingDirection: isRTL ? "rtl" : "ltr" },
        ]}
      >
        {title.toUpperCase()}
      </Text>
      <View
        style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  icon,
  children,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderTopColor: colors.border }]}>
      <View style={styles.rowLeft}>
        <Feather name={icon} size={18} color={colors.mutedForeground} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>{children}</View>
    </View>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.muted }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segItem, { backgroundColor: active ? colors.card : "transparent" }]}
          >
            <Text
              style={[
                styles.segText,
                { color: active ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, gap: 18 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", paddingHorizontal: 4,
  },
  sectionCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, minHeight: 56, gap: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  rowRight: { flexShrink: 0, maxWidth: "60%" },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  segmented: { flexDirection: "row", padding: 3, borderRadius: 10 },
  segItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  segText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  input: {
    minWidth: 140, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    fontSize: 14, fontFamily: "Inter_500Medium",
  },
  serialChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  serialText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  note: {
    fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center",
    paddingHorizontal: 16, lineHeight: 18,
  },
});
