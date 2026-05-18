import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useT } from "@/src/i18n/useT";

/**
 * Floating "Punishment" action chip rendered inside the multiplayer room
 * while the game is active. The parent (`room.tsx`) decides whether it
 * should appear at all — this component is purely presentational and only
 * concerns itself with the disabled/cooldown visual state.
 */
export function PunishmentButton({
  onPress,
  disabled,
  cooldownRemainingSec,
}: {
  onPress: () => void;
  disabled?: boolean;
  /** Seconds left until cooldown ends, or 0 if ready. */
  cooldownRemainingSec: number;
}) {
  const colors = useColors();
  const { t, lz } = useT();
  const isCooling = cooldownRemainingSec > 0;
  const isDisabled = disabled || isCooling;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: isDisabled ? colors.muted : colors.destructive,
          borderColor: isDisabled ? colors.border : colors.destructive,
          opacity: pressed ? 0.85 : isDisabled ? 0.6 : 1,
        },
      ]}
      accessibilityLabel={t("punishment.button")}
    >
      <Feather
        name="zap"
        size={16}
        color={isDisabled ? colors.mutedForeground : colors.destructiveForeground}
      />
      <Text
        style={[
          styles.label,
          {
            color: isDisabled ? colors.mutedForeground : colors.destructiveForeground,
          },
        ]}
      >
        {t("punishment.button")}
      </Text>
      {isCooling ? (
        <View style={[styles.pill, { backgroundColor: colors.background }]}>
          <Text style={[styles.pillText, { color: colors.foreground }]}>
            {lz(cooldownRemainingSec)}s
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 4,
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
});
