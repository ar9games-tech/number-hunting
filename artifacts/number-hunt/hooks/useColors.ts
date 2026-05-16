import colors from "@/constants/colors";
import { useSettingsOrDefault } from "@/src/contexts/SettingsContext";

/**
 * Returns the design tokens for the active palette.
 *
 * The active palette is driven by the user's `themeMode` setting in
 * SettingsContext (system | light | dark). When set to "system", it follows
 * the device color scheme. This makes theme switching instantaneous and
 * persistent across app restarts.
 *
 * Uses the safe SettingsContext variant so this hook also works when
 * called from the ErrorBoundary fallback (rendered outside the provider).
 */
export function useColors() {
  const { effectiveScheme } = useSettingsOrDefault();
  const palette =
    effectiveScheme === "dark" && "dark" in colors
      ? ((colors as unknown as Record<string, typeof colors.light>)["dark"] ?? colors.light)
      : colors.light;
  return { ...palette, radius: colors.radius };
}
