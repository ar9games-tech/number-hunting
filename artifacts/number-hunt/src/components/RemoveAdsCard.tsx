import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { useT } from "@/src/i18n/useT";
import {
  REMOVE_ADS_PRICE_DISPLAY,
  useAdsRemoved,
} from "@/src/services/iap";

/**
 * "Remove Ads Forever" purchase card — single component reused on the
 * Settings screen AND the Profile screen (which doubles as the Shop
 * surface, since there is no standalone Shop screen). Self-contained:
 * reads its own state from the AdsRemovedProvider and switches between
 * "buy" / "purchased" UI.
 */
export function RemoveAdsCard() {
  const colors = useColors();
  const { t, isRTL } = useT();
  const { adsRemoved, loading, busy, purchase } = useAdsRemoved();
  const wd = isRTL ? "rtl" : "ltr";

  if (loading) return null; // avoid a flash of "Buy" while we hydrate

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.icon,
            {
              backgroundColor: (adsRemoved ? colors.primary : colors.accent) + "22",
            },
          ]}
        >
          <Feather
            name={adsRemoved ? "check-circle" : "shield"}
            size={20}
            color={adsRemoved ? colors.primary : colors.accent}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.title, { color: colors.foreground, writingDirection: wd }]}
            numberOfLines={2}
          >
            {t("iap.removeAdsTitle")}
          </Text>
          <Text
            style={[styles.body, { color: colors.mutedForeground, writingDirection: wd }]}
          >
            {t("iap.removeAdsBody")}
          </Text>
        </View>
      </View>

      {adsRemoved ? (
        <Text
          style={[styles.purchased, { color: colors.primary, writingDirection: wd }]}
        >
          {t("iap.purchased")}
        </Text>
      ) : (
        <Button
          title={busy ? t("iap.processing") : t("iap.buyCta", { price: REMOVE_ADS_PRICE_DISPLAY })}
          variant="primary"
          fullWidth
          loading={busy}
          disabled={busy}
          onPress={() => void purchase()}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  body: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 16,
  },
  purchased: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    paddingVertical: 8,
  },
});
