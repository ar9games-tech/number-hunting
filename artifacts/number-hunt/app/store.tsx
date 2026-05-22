import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { RemoveAdsCard } from "@/src/components/RemoveAdsCard";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useT } from "@/src/i18n/useT";
import { webBottomInset } from "@/src/theme/theme";

/**
 * Store screen — dedicated entrypoint for the "Remove Ads Forever"
 * in-app purchase. Reached from the small Store icon in the Home
 * screen's top-left corner. The RemoveAdsCard is reused as-is so the
 * Profile and Settings shop surfaces stay in sync automatically.
 */
export default function StoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useT();
  const wd = isRTL ? "rtl" : "ltr";
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("store.title")} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.mutedForeground, writingDirection: wd }]}>
          {t("store.intro")}
        </Text>
        <RemoveAdsCard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },
  intro: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    paddingHorizontal: 4,
  },
});
