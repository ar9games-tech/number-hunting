import { Feather } from "@expo/vector-icons";
import React from "react";
import {
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
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { Language, ThemeMode } from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Settings" />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Profile">
          <Row label="Player name" icon="user">
            <TextInput
              value={settings.playerName}
              onChangeText={(t) => void update({ playerName: t.slice(0, 24) })}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            />
          </Row>
        </Section>

        <Section title="Appearance">
          <Row label="Theme" icon="moon">
            <Segmented
              value={settings.themeMode}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              onChange={(v) => void update({ themeMode: v as ThemeMode })}
            />
          </Row>
          <Row label="Language" icon="globe">
            <Segmented
              value={settings.language}
              options={[
                { value: "en", label: "English" },
                { value: "ar", label: "العربية" },
              ]}
              onChange={(v) => void update({ language: v as Language })}
            />
          </Row>
        </Section>

        <Section title="Gameplay">
          <Row label="Allow leading zero" icon="hash">
            <Switch
              value={settings.allowLeadingZero}
              onValueChange={(v) => void update({ allowLeadingZero: v })}
              trackColor={{ true: colors.primary }}
            />
          </Row>
          <Row label="Haptic feedback" icon="zap">
            <Switch
              value={settings.hapticsOn}
              onValueChange={(v) => void update({ hapticsOn: v })}
              trackColor={{ true: colors.primary }}
            />
          </Row>
          <Row label="Sound effects" icon="volume-2">
            <Switch
              value={settings.soundOn}
              onValueChange={(v) => void update({ soundOn: v })}
              trackColor={{ true: colors.primary }}
            />
          </Row>
        </Section>

        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          Sound and Arabic translation are placeholders for future updates.
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        {title.toUpperCase()}
      </Text>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
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
            style={[
              styles.segItem,
              {
                backgroundColor: active ? colors.card : "transparent",
              },
            ]}
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
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 18,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    gap: 12,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  rowRight: {
    flexShrink: 0,
    maxWidth: "60%",
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  segmented: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 10,
  },
  segItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    minWidth: 140,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  note: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },
});
