import { useCallback, useMemo } from "react";

import { useSettings } from "@/src/contexts/SettingsContext";
import { localizeNumber } from "@/src/utils/numberLocalization";

import {
  RTL_LANGUAGES,
  interpolate,
  translations,
  type Language,
  type TranslationKey,
} from "./translations";

export type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** Function that localizes any number/string for the active language. */
export type LzFn = (value: string | number) => string;

/**
 * Translation hook. Reads the active language from SettingsContext.
 *
 * - `t(key, params)` returns the translated string. Numeric params are
 *   automatically converted to the active language's digit script (e.g.
 *   Arabic-Indic digits when the language is Arabic).
 * - `lz(value)` localizes any numeric value or string of digits for display.
 *   Use it for timers, scores, room codes, and any inline numbers.
 */
export function useT(): {
  t: TFn;
  lz: LzFn;
  language: Language;
  isRTL: boolean;
} {
  const { settings } = useSettings();
  const language = settings.language;
  const dict = translations[language];
  const fallback = translations.en;

  const lz = useCallback<LzFn>((value) => localizeNumber(value, language), [language]);

  const t = useCallback<TFn>(
    (key, params) => {
      const template = dict[key] ?? fallback[key] ?? key;
      // Auto-localize numeric/digit params so callers don't have to wrap them.
      const localized = params
        ? Object.fromEntries(
            Object.entries(params).map(([k, v]) => [
              k,
              typeof v === "number" || /^[0-9]+$/.test(String(v))
                ? localizeNumber(v, language)
                : String(v),
            ]),
          )
        : undefined;
      return interpolate(template, localized);
    },
    [dict, fallback, language],
  );

  return useMemo(
    () => ({ t, lz, language, isRTL: RTL_LANGUAGES.has(language) }),
    [t, lz, language],
  );
}
