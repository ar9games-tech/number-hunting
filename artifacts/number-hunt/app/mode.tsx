import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { webBottomInset } from "@/src/theme/theme";

export default function ModeSelectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 16;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Choose Mode" />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        <Card
          title="Solo"
          subtitle="Race the clock. Beat your best time."
          icon="user"
          onPress={() => router.push({ pathname: "/difficulty", params: { mode: "solo" } })}
        />
        <Card
          title="Multiplayer"
          subtitle="Create or join a room. Play with a friend."
          icon="users"
          onPress={() => router.push("/lobby")}
        />
      </View>
    </View>
  );
}

function Card({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={28} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={22} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  cardSub: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
