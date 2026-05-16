import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useT } from "@/src/i18n/useT";
import { webTopInset } from "@/src/theme/theme";

export function ScreenHeader({
  title,
  showBack = true,
  rightSlot,
}: {
  title?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isRTL, t } = useT();
  const topPad = (Platform.OS === "web" ? webTopInset() : insets.top) + 6;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: topPad,
          backgroundColor: colors.background,
          borderBottomColor: "transparent",
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {showBack ? (
            <Pressable
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace("/");
              }}
              hitSlop={12}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityLabel={t("misc.goBack")}
            >
              <Feather
                name={isRTL ? "chevron-right" : "chevron-left"}
                size={22}
                color={colors.foreground}
              />
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {title ?? ""}
        </Text>
        <View style={[styles.side, { alignItems: "flex-end" }]}>{rightSlot}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  side: {
    width: 60,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
});
