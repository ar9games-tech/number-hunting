import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { NumberDisplay } from "@/src/components/NumberDisplay";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useT } from "@/src/i18n/useT";
import { switchRoles } from "@/src/net/socketPlaceholder";
import { webBottomInset } from "@/src/theme/theme";
import { formatTime } from "@/src/utils/scoring";

export default function ResultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lz } = useT();
  const params = useLocalSearchParams<{
    mode?: string;
    digits?: string;
    timeSec?: string;
    guesses?: string;
    isNewRecord?: string;
    won?: string;
    winnerName?: string;
    code?: string;
    hidden?: string;
  }>();

  const mode = params.mode ?? "solo";
  const digits = parseInt(params.digits ?? "3", 10);
  const timeSec = parseInt(params.timeSec ?? "0", 10);
  const guesses = parseInt(params.guesses ?? "0", 10);
  const isNewRecord = params.isNewRecord === "1";
  const isOnline = mode === "online";
  const hidden = params.hidden ?? "";
  const code = params.code ?? "";

  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(20)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 8 }),
    ]).start();
    if (isNewRecord) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(burst, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(burst, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [fade, lift, burst, isNewRecord]);

  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[colors.gradientSoftFrom, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <ScreenHeader title={isOnline ? t("result.online") : t("result.solo")} />
      <View style={[styles.container, { paddingBottom: bottomPad }]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: fade,
              transform: [{ translateY: lift }],
            },
          ]}
        >
          {isNewRecord ? (
            <Animated.View
              style={[
                styles.recordBadge,
                {
                  backgroundColor: colors.accent,
                  transform: [
                    {
                      scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }),
                    },
                  ],
                },
              ]}
            >
              <Feather name="award" size={16} color={colors.accentForeground} />
              <Text style={[styles.recordText, { color: colors.accentForeground }]}>
                {t("result.newRecord")}
              </Text>
            </Animated.View>
          ) : null}

          <View style={[styles.iconCircle, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check-circle" size={36} color={colors.success} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isOnline
              ? t("result.someoneWon", { name: params.winnerName ?? "Player" })
              : t("result.youGotIt")}
          </Text>

          {hidden ? (
            <View style={{ alignItems: "center", gap: 8, marginTop: 8 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {t("result.hidden")}
              </Text>
              <NumberDisplay digits={digits} reveal={hidden} />
            </View>
          ) : null}

          <View style={styles.statsRow}>
            {!isOnline ? <Stat label={t("result.time")} value={lz(formatTime(timeSec))} icon="clock" /> : null}
            <Stat label={t("result.guesses")} value={lz(guesses)} icon="hash" />
            <Stat label={t("result.digits")} value={lz(digits)} icon="layers" />
          </View>
        </Animated.View>

        <View style={styles.actions}>
          {isOnline ? (
            <>
              <Button
                title={t("result.switchAndPlay")}
                fullWidth
                onPress={() => {
                  if (code) switchRoles(code);
                  router.replace({
                    pathname: "/room",
                    params: { code, role: "host", digits: String(digits) },
                  });
                }}
              />
              <Button
                title={t("result.leaveRoom")}
                fullWidth
                variant="ghost"
                onPress={() => router.replace("/lobby")}
              />
            </>
          ) : (
            <>
              <Button
                title={t("result.playAgain")}
                fullWidth
                onPress={() =>
                  router.replace({ pathname: "/solo", params: { digits: String(digits) } })
                }
              />
              <Button
                title={t("result.viewRecords")}
                fullWidth
                variant="secondary"
                onPress={() => router.replace("/records")}
              />
              <Button
                title={t("result.home")}
                fullWidth
                variant="ghost"
                onPress={() => router.replace("/")}
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function Stat({
  label, value, icon,
}: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  const colors = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 18, justifyContent: "space-between",
  },
  card: {
    padding: 24, borderRadius: 24, borderWidth: 1,
    alignItems: "center", gap: 14, position: "relative",
  },
  recordBadge: {
    position: "absolute", top: -14,
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  recordText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  label: { fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 10, width: "100%" },
  stat: {
    flex: 1, alignItems: "center", paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, gap: 4,
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  actions: { gap: 10 },
});
