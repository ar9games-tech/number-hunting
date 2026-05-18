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
}: {
  onPress: () => void;
  used: boolean;
}) {
  const colors = useColors();
  const { t } = useT();

  return (
    <Pressable
      onPress={onPress}
      disabled={used}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: used ? colors.muted : colors.destructive,
          borderColor: used ? colors.border : colors.destructive,
          opacity: pressed ? 0.85 : used ? 0.7 : 1,
        },
      ]}
      accessibilityLabel={used ? t("punishment.alreadyUsed") : t("punishment.button")}
    >
      <View style={styles.row}>
        <Feather
          name={used ? "check-circle" : "zap"}
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
          {used ? t("punishment.alreadyUsed") : t("punishment.button")}
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
