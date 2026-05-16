import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/src/contexts/SettingsContext";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  size?: "sm" | "md" | "lg";
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  fullWidth,
  style,
  textStyle,
  testID,
  size = "md",
}: ButtonProps) {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  const handlePressIn = () => {
    animateTo(0.97);
    if (settings.hapticsOn && Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  const handlePressOut = () => animateTo(1);

  const pad = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const fontSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;

  const renderInner = () => (
    <Text
      style={[
        styles.text,
        {
          color:
            variant === "primary"
              ? colors.primaryForeground
              : variant === "destructive"
                ? colors.destructiveForeground
                : variant === "secondary"
                  ? colors.secondaryForeground
                  : colors.foreground,
          fontSize,
        },
        textStyle,
      ]}
      numberOfLines={1}
    >
      {title}
    </Text>
  );

  const baseStyle: ViewStyle = {
    paddingVertical: pad,
    paddingHorizontal: pad + 6,
    borderRadius: colors.radius,
    alignItems: "center",
    justifyContent: "center",
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? "100%" : undefined,
  };

  const wrapperStyle: ViewStyle = {
    transform: [{ scale }],
    width: fullWidth ? "100%" : undefined,
  };

  return (
    <Animated.View style={wrapperStyle}>
      <Pressable
        onPress={disabled || loading ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
        accessibilityRole="button"
      >
        {variant === "primary" ? (
          <LinearGradient
            colors={[colors.gradientFrom, colors.gradientTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[baseStyle, style]}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : renderInner()}
          </LinearGradient>
        ) : (
          <View
            style={[
              baseStyle,
              variant === "secondary" && { backgroundColor: colors.secondary },
              variant === "destructive" && { backgroundColor: colors.destructive },
              variant === "ghost" && {
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: colors.border,
              },
              style,
            ]}
          >
            {loading ? <ActivityIndicator color={colors.foreground} /> : renderInner()}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
