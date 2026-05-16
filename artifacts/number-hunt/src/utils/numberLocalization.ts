// Locale-aware digit conversion utilities.
//
// Game logic (comparisons, validation, storage) always works with English
// digits 0-9. These helpers convert to/from Arabic-Indic digits (٠-٩) for
// display purposes only.

import type { Language } from "@/src/i18n/translations";

const EN_TO_AR: Record<string, string> = {
  "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤",
  "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩",
};

const AR_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_AR).map(([en, ar]) => [ar, en]),
);

/** Convert any English digits in `value` to Arabic-Indic digits. */
export function toArabicDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => EN_TO_AR[d] ?? d);
}

/** Convert any Arabic-Indic digits in `value` back to English digits. */
export function toEnglishDigits(value: string | number): string {
  return String(value).replace(/[٠-٩]/g, (d) => AR_TO_EN[d] ?? d);
}

/**
 * Format `value` for display in the active language. Returns Arabic-Indic
 * digits when the language is Arabic, otherwise English digits.
 */
export function localizeNumber(value: string | number, language: Language): string {
  return language === "ar" ? toArabicDigits(value) : toEnglishDigits(value);
}
