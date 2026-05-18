import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useT } from "@/src/i18n/useT";

/**
 * Winner-only "Punishment" action button rendered on the result screen.
 * Pressable once per match — after the reveal it permanently switches to
 * the "Punishment already used" disabled state.
 */
export function PunishmentButton({
  onPress,
  used,
  loading = false,
}: {
  onPress: () => void;
  used: boolean;
  /** True while we're waiting for the server's reveal broadcast. */
  loading?: boolean;
}) {
  const colors = useColors();
  const { t } = useT();
  const disabled = used || loading;
  const label = used
    ? t("punishment.alreadyUsed")
    : loading
      ? t("punishment.opening")
      : t("punishment.button");
  const iconName = used ? "check-circle" : loading ? "loader" : "zap";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: used ? colors.muted : colors.destructive,
          borderColor: used ? colors.border : colors.destructive,
          opacity: pressed ? 0.85 : disabled ? 0.7 : 1,
        },
      ]}
      accessibilityLabel={label}
    >
      <View style={styles.row}>
        <Feather
          name={iconName}
          size={18}
          color={used ? colors.mutedForeground : colors.destructiveForeground}
        />
        <Text
          style={[
            styles.label,
            {
              color: used ? colors.mutedForeground : colors.destructiveForeground,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
});
