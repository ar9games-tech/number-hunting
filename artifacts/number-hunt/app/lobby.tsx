import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useT } from "@/src/i18n/useT";
import { getRoom } from "@/src/net/socketPlaceholder";
import { webBottomInset } from "@/src/theme/theme";

export default function MultiplayerLobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useT();
  const [code, setCode] = useState("");
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;
  const wd = isRTL ? "rtl" : "ltr";

  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      Alert.alert(t("lobby.invalidCode"), t("lobby.invalidCodeMsg"));
      return;
    }
    setJoining(true);
    try {
      const room = await getRoom(trimmed);
      if (!room) {
        Alert.alert(t("lobby.notFound"), t("lobby.notFoundMsg"));
        return;
      }
      router.push({
        pathname: "/room",
        params: { role: "guest", code: trimmed, digits: String(room.digits) },
      });
    } catch {
      Alert.alert(t("lobby.notFound"), t("lobby.notFoundMsg"));
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("lobby.title")} />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
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
            onPress={() =>
              router.push({ pathname: "/difficulty", params: { mode: "online-create" } })
            }
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
