// Bilingual placeholder dictionary. Only English is fully wired up in the UI.
// Arabic strings are placeholders so the language toggle in Settings can be
// flipped without breaking anything. A future pass can swap based on
// useSettings().settings.language.

export const STRINGS = {
  en: {
    appName: "Number Hunt",
    solo: "Solo",
    multiplayer: "Multiplayer",
    howToPlay: "How to Play",
    records: "Records",
    settings: "Settings",
  },
  ar: {
    appName: "صيد الأرقام",
    solo: "فردي",
    multiplayer: "متعدد اللاعبين",
    howToPlay: "كيفية اللعب",
    records: "السجلات",
    settings: "الإعدادات",
  },
} as const;
