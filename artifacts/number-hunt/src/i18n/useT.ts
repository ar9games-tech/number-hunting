import { useCallback, useMemo } from "react";

import { useSettings } from "@/src/contexts/SettingsContext";

import {
  RTL_LANGUAGES,
  interpolate,
  translations,
  type Language,
  type TranslationKey,
} from "./translations";

export type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/**
 * Translation hook. Reads the active language from SettingsContext.
 * Falls back to English when a key is missing in the active language.
 */
export function useT(): {
  t: TFn;
  language: Language;
  isRTL: boolean;
} {
  const { settings } = useSettings();
  const language = settings.language;
  const dict = translations[language];
  const fallback = translations.en;

  const t = useCallback<TFn>(
    (key, params) => {
      const template = dict[key] ?? fallback[key] ?? key;
      return interpolate(template, params);
    },
    [dict, fallback],
  );

  return useMemo(
    () => ({ t, language, isRTL: RTL_LANGUAGES.has(language) }),
    [t, language],
  );
}
