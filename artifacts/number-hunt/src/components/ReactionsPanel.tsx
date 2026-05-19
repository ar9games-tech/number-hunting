/**
 * Bottom-sheet style modal for picking a reaction to send.
 *
 * Two sections: a single row of emoji and a wrapped grid of short text
 * reactions. Text reactions are pulled from the active language (EN/AR).
 * Closes on dim overlay tap or after a pick.
 */

import React from "react";
import {
  I18nManager,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  EMOJI_REACTIONS,
  textReactionsFor,
} from "@/src/services/reactionManager";
import type { Language } from "@/src/storage/storage";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (reaction: string) => void;
  language: Language;
  title: string;
  emojiLabel: string;
  textLabel: string;
};

export function ReactionsPanel({
  visible,
  onClose,
  onPick,
  language,
  title,
  emojiLabel,
  textLabel,
}: Props) {
  const colors = useColors();
  const isRTL = I18nManager.isRTL;
  const wd = isRTL ? "rtl" : "ltr";
  const texts = textReactionsFor(language);

  const handlePick = (r: string) => {
    onPick(r);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              { color: colors.foreground, writingDirection: wd },
            ]}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.section,
              { color: colors.mutedForeground, writingDirection: wd },
            ]}
          >
            {emojiLabel}
          </Text>
          <View style={styles.emojiRow}>
            {EMOJI_REACTIONS.map((e) => (
              <Pressable
                key={e}
                onPress={() => handlePick(e)}
                style={({ pressed }) => [
                  styles.emojiBtn,
                  {
                    backgroundColor: pressed ? colors.muted : colors.secondary,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={e}
              >
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Text
            style={[
              styles.section,
              { color: colors.mutedForeground, writingDirection: wd },
            ]}
          >
            {textLabel}
          </Text>
          <View style={styles.textWrap}>
            {texts.map((t) => (
              <Pressable
                key={t}
                onPress={() => handlePick(t)}
                style={({ pressed }) => [
                  styles.textBtn,
                  {
                    backgroundColor: pressed ? colors.muted : colors.secondary,
                    borderColor: colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t}
              >
                <Text
                  style={[
                    styles.textReaction,
                    {
                      color: colors.secondaryForeground,
                      writingDirection: wd,
                    },
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  section: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 6,
  },
  emojiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
  },
  emojiBtn: {
    width: 56,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 26 },
  textWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  textBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textReaction: {
    fontSize: 14,
    fontWeight: "600",
  },
});
