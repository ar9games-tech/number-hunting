import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import { getRoomMeta } from "@/src/net/socketPlaceholder";
import { formatPlayerIdentity } from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";

export default function MultiplayerLobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, ready } = useSettings();
  const { t, isRTL } = useT();
  const [code, setCode] = useState("");
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;
  const wd = isRTL ? "rtl" : "ltr";

  const [joining, setJoining] = useState(false);

  // Online play requires a saved identity — never prompt for a nickname
  // inside the multiplayer flow. Send the user to welcome if it's missing.
  const needsProfile =
    ready && (!settings.hasOnboarded || !settings.playerName.trim());
  useEffect(() => {
    if (needsProfile) {
      router.replace("/welcome");
    }
  }, [needsProfile]);

  const identity = formatPlayerIdentity(settings.playerName, settings.playerSerial);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      Alert.alert(t("lobby.invalidCode"), t("lobby.invalidCodeMsg"));
      return;
    }
    setJoining(true);
    try {
      // Probe the room first so we can give a precise error (full / already
      // playing / not found) before the user is dropped into the room.
      const meta = await getRoomMeta(trimmed);
      if (!meta) {
        Alert.alert(t("lobby.notFound"), t("lobby.notFoundMsg"));
        return;
      }
      if (meta.status !== "waiting") {
        Alert.alert(t("lobby.joinStarted"), t("lobby.joinStartedMsg"));
        return;
      }
      if (meta.playerCount >= meta.maxPlayers) {
        Alert.alert(t("lobby.joinFull"), t("lobby.joinFullMsg"));
        return;
      }
      router.push({
        pathname: "/room",
        params: { code: trimmed },
      });
    } catch {
      Alert.alert(t("lobby.notFound"), t("lobby.notFoundMsg"));
    } finally {
      setJoining(false);
    }
  };

  if (needsProfile || !ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("lobby.title")} />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        {/* Show the player's saved identity so they know which name will
            appear to the opponent — no prompt, no edit field here. */}
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

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="plus-circle" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}>
            {t("lobby.create")}
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground, writingDirection: wd }]}>
            {t("lobby.createDesc")}
          </Text>
          <Button
            title={t("lobby.createBtn")}
            fullWidth
            onPress={() => router.push("/create-room")}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="log-in" size={24} color={colors.accent} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}>
            {t("lobby.join")}
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground, writingDirection: wd }]}>
            {t("lobby.joinDesc")}
          </Text>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder={t("lobby.codePh")}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
          />
          <Button
            title={joining ? t("lobby.joinBtn") + "…" : t("lobby.joinBtn")}
            fullWidth
            variant="secondary"
            disabled={joining}
            onPress={() => {
              void handleJoin();
            }}
          />
        </View>

        <Text style={[styles.note, { color: colors.mutedForeground, writingDirection: wd }]}>
          {t("lobby.note")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 16 },
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
  card: { padding: 18, borderRadius: 20, borderWidth: 1, gap: 10 },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  input: {
    borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: 6, textAlign: "center",
  },
  note: {
    marginTop: "auto", fontSize: 12, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 18, paddingHorizontal: 12,
  },
});
