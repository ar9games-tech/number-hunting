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
      // Auto-localize params:
      //  - numbers / pure-digit strings → convert to active digit script and
      //    wrap in LTR isolates so they read left-to-right inside RTL text.
      //  - alphanumeric strings containing digits (e.g. room codes "AB12CD")
      //    → wrap in LTR isolates without converting letters, to keep the
      //    code rendered as a single LTR token in Arabic UI.
      const localized = params
        ? Object.fromEntries(
            Object.entries(params).map(([k, v]) => {
              const s = String(v);
              if (typeof v === "number" || /^[0-9]+$/.test(s)) {
                return [k, localizeNumber(v, language)];
              }
              if (/[0-9]/.test(s)) {
                return [k, `\u2066${s}\u2069`];
              }
              return [k, s];
            }),
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
