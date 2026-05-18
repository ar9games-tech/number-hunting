import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/src/components/GlassCard";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import { webBottomInset } from "@/src/theme/theme";
import { playTap, tapHaptic } from "@/src/utils/sound";

export default function ModeSelectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 16;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("mode.title")} />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        <Card
          title={t("mode.solo")}
          subtitle={t("mode.soloDesc")}
          icon="user"
          onPress={() => router.push({ pathname: "/difficulty", params: { mode: "solo" } })}
        />
        <Card
          title={t("mode.multiplayer")}
          subtitle={t("mode.mpDesc")}
          icon="users"
          onPress={() => router.push("/lobby")}
        />
      </View>
    </View>
  );
}

function Card({
  title, subtitle, icon, onPress,
}: {
  title: string; subtitle: string;
  icon: keyof typeof Feather.glyphMap; onPress: () => void;
}) {
  const colors = useColors();
  const { settings } = useSettings();
  const { isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          animateTo(0.98);
          tapHaptic(settings.hapticsOn);
          playTap(settings.soundOn);
        }}
        onPressOut={() => animateTo(1)}
      >
        <GlassCard tone="primary" style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name={icon} size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}>
              {title}
            </Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground, writingDirection: wd }]}>
              {subtitle}
            </Text>
          </View>
          <Feather
            name={isRTL ? "chevron-left" : "chevron-right"}
            size={22}
            color={colors.mutedForeground}
          />
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 24, gap: 14 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 16,
    padding: 18,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  cardSub: { marginTop: 4, fontSize: 14, fontFamily: "Inter_400Regular" },
});
