import { Platform } from "react-native";

export const WEB_TOP_INSET = 67;
export const WEB_BOTTOM_INSET = 34;

export function webTopInset(): number {
  return Platform.OS === "web" ? WEB_TOP_INSET : 0;
}

export function webBottomInset(): number {
  return Platform.OS === "web" ? WEB_BOTTOM_INSET : 0;
}

export const SHADOW = {
  elevation: 4,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
};
