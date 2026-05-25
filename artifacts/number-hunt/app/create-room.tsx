import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import {
  createRoom,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "@/src/net/socketPlaceholder";
import { formatPlayerIdentity } from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";

/**
 * Host picks how many players the room should hold (2–12), then creates
 * the room. Digit length is NOT picked here — it's picked from inside the
 * room screen, only once the room is full. That's what triggers the game.
 */
export default function CreateRoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, ready } = useSettings();
  const { t, isRTL, lz } = useT();
  const [selected, setSelected] = useState<number>(4);
  const [busy, setBusy] = useState(false);
  const wd = isRTL ? "rtl" : "ltr";

  // Online flow requires a nickname — bounce to /welcome otherwise.
  const needsProfile =
    ready && (!settings.hasOnboarded || !settings.playerName.trim());
  useEffect(() => {
    if (needsProfile) router.replace("/welcome");
  }, [needsProfile]);

  const identity = formatPlayerIdentity(settings.playerName, settings.playerSerial);

  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const options: number[] = [];
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) options.push(n);

  const onCreate = async () => {
    if (busy || !identity) return;
    setBusy(true);
    try {
      const state = await createRoom(selected, identity);
      router.replace({ pathname: "/room", params: { code: state.code } });
    } catch {
      Alert.alert(t("create.errorTitle"), t("create.errorMsg"));
      setBusy(false);
    }
  };

  if (needsProfile || !ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScreenHeader title={t("create.title")} />
      {/* flexGrow:1 lets the content fill short viewports; the extra
          40px on top of the safe-area inset keeps the Create button
          fully visible above the home indicator / web preview chrome
          on the smallest supported screens. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: bottomPad + 40, flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.identityBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <View style={[styles.identityDot, { backgroundColor: colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.identityLabel, { color: colors.mutedForeground, writingDirection: wd }]}>
              {t("lobby.playingAs")}
            </Text>
            <Text style={[styles.identityName, { color: colors.foreground }]} numberOfLines={1}>
              {identity}
            </Text>
          </View>
        </View>

        <Text style={[styles.lead, { color: colors.mutedForeground, writingDirection: wd }]}>
          {t("create.lead")}
        </Text>

        <View style={styles.grid}>
          {options.map((n) => {
            const active = selected === n;
            return (
              <Pressable
                key={n}
                onPress={() => setSelected(n)}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityLabel={t("create.players", { n })}
              >
                <Text
                  style={[
                    styles.cellNum,
                    { color: active ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {lz(n)}
                </Text>
                <Text
                  style={[
                    styles.cellLabel,
                    {
                      color: active
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {t("create.playersShort")}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="users" size={18} color={colors.primary} />
          <Text style={[styles.summaryText, { color: colors.foreground, writingDirection: wd }]}>
            {t("create.summary", { n: selected })}
          </Text>
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground, writingDirection: wd }]}>
          {t("create.hint")}
        </Text>

        <Button
          title={busy ? t("create.creating") : t("create.btn")}
          fullWidth
          size="lg"
          disabled={busy}
          loading={busy}
          onPress={() => void onCreate()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  identityBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  identityDot: { width: 8, height: 8, borderRadius: 4 },
  identityLabel: { fontSize: 10, letterSpacing: 1.2, fontFamily: "Inter_700Bold" },
  identityName: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  lead: { fontSize: 14, fontFamily: "Inter_400Regular", paddingHorizontal: 4, lineHeight: 20 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    width: "31%",
    aspectRatio: 1.4,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cellNum: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  cellLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 4,
    lineHeight: 17,
  },
});
