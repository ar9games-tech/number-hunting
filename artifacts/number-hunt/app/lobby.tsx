import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { getRoom } from "@/src/net/socketPlaceholder";
import { webBottomInset } from "@/src/theme/theme";

export default function MultiplayerLobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      Alert.alert("Invalid code", "Please enter a valid room code.");
      return;
    }
    const room = getRoom(trimmed);
    if (!room) {
      Alert.alert("Room not found", "Double-check the code with the host.");
      return;
    }
    router.push({
      pathname: "/room",
      params: { role: "guest", code: trimmed, digits: String(room.digits) },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Multiplayer" />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="plus-circle" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Create a Room</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            Pick a difficulty, get a code, and share it with a friend.
          </Text>
          <Button
            title="Create Room"
            fullWidth
            onPress={() =>
              router.push({ pathname: "/difficulty", params: { mode: "online-create" } })
            }
          />
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="log-in" size={24} color={colors.accent} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Join a Room</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            Enter the 6-character code from the host.
          </Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="ABC123"
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
          <Button title="Join Room" fullWidth variant="secondary" onPress={handleJoin} />
        </View>

        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          This is a local simulation. Real online multiplayer can be added by replacing
          src/net/socketPlaceholder.ts with a socket.io connection.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  cardSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: 6,
    textAlign: "center",
  },
  note: {
    marginTop: "auto",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
