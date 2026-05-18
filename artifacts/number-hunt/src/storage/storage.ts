import AsyncStorage from "@react-native-async-storage/async-storage";

import { isNewBest } from "@/src/utils/scoring";
import type { Digits } from "@/src/utils/gameLogic";

const RECORDS_KEY = "number-hunt:records:v1";
const SETTINGS_KEY = "number-hunt:settings:v1";
const STATS_KEY = "number-hunt:stats:v1";

export type Record = {
  bestTimeSec: number;
  guesses: number;
  dateISO: string;
};

export type Records = {
  2?: Record;
  3?: Record;
  4?: Record;
};

export type ThemeMode = "system" | "light" | "dark";
export type Language = "en" | "ar";

export type Settings = {
  themeMode: ThemeMode;
  allowLeadingZero: boolean;
  soundOn: boolean;
  hapticsOn: boolean;
  language: Language;
  playerName: string;
};

export const DEFAULT_SETTINGS: Settings = {
  themeMode: "system",
  allowLeadingZero: false,
  soundOn: true,
  hapticsOn: true,
  language: "en",
  playerName: "Player 1",
};

// ---------------------------------------------------------------------------
// Lifetime stats — separate from "Records" (which stores the single best run
// per difficulty). Stats are aggregates across every finished game (solo
// + online), used by the dashboard on the Records screen.
// ---------------------------------------------------------------------------

export type DigitStats = {
  wins: number;
  totalGuessesWon: number; // sum of guesses on wins, used for averages
};

export type Stats = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  bestStreak: number;
  currentStreak: number;
  perDigit: { 2: DigitStats; 3: DigitStats; 4: DigitStats };
};

/**
 * Builds a fresh zeroed Stats object every call. Used in place of a
 * shared `DEFAULT_STATS` constant because callers (recordWin / recordLoss)
 * mutate the returned object — sharing nested references would leak
 * mutations back into the "default" and break clearStats semantics.
 */
export function createDefaultStats(): Stats {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    bestStreak: 0,
    currentStreak: 0,
    perDigit: {
      2: { wins: 0, totalGuessesWon: 0 },
      3: { wins: 0, totalGuessesWon: 0 },
      4: { wins: 0, totalGuessesWon: 0 },
    },
  };
}

/** Kept exported for type/value back-compat; never mutate. */
export const DEFAULT_STATS: Stats = createDefaultStats();

function mergeStats(raw: Partial<Stats> | null | undefined): Stats {
  // Always start from a freshly-allocated default so nothing we return
  // shares nested references with module-level state.
  const base = createDefaultStats();
  if (!raw) return base;
  const perDigit = (raw.perDigit ?? {}) as Partial<Stats["perDigit"]>;
  return {
    gamesPlayed: raw.gamesPlayed ?? base.gamesPlayed,
    wins: raw.wins ?? base.wins,
    losses: raw.losses ?? base.losses,
    bestStreak: raw.bestStreak ?? base.bestStreak,
    currentStreak: raw.currentStreak ?? base.currentStreak,
    perDigit: {
      2: { ...base.perDigit[2], ...(perDigit[2] ?? {}) },
      3: { ...base.perDigit[3], ...(perDigit[3] ?? {}) },
      4: { ...base.perDigit[4], ...(perDigit[4] ?? {}) },
    },
  };
}

export async function getStats(): Promise<Stats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (!raw) return mergeStats(null);
    return mergeStats(JSON.parse(raw) as Partial<Stats>);
  } catch {
    return mergeStats(null);
  }
}

async function saveStats(stats: Stats): Promise<void> {
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

/** Record a winning game. Bumps games, wins, streak, per-digit aggregates. */
export async function recordWin(digits: Digits, guesses: number): Promise<Stats> {
  const stats = await getStats();
  stats.gamesPlayed += 1;
  stats.wins += 1;
  stats.currentStreak += 1;
  if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
  const pd = stats.perDigit[digits];
  pd.wins += 1;
  pd.totalGuessesWon += guesses;
  await saveStats(stats);
  return stats;
}

/** Record a lost game. Bumps games + losses and resets the current streak. */
export async function recordLoss(): Promise<Stats> {
  const stats = await getStats();
  stats.gamesPlayed += 1;
  stats.losses += 1;
  stats.currentStreak = 0;
  await saveStats(stats);
  return stats;
}

export async function clearStats(): Promise<void> {
  await AsyncStorage.removeItem(STATS_KEY);
}

// ---------------------------------------------------------------------------
// Records — single-best-run snapshot per difficulty (legacy, kept as-is).
// ---------------------------------------------------------------------------

export async function getRecords(): Promise<Records> {
  try {
    const raw = await AsyncStorage.getItem(RECORDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Records;
  } catch {
    return {};
  }
}

export async function saveRecordIfBest(
  digits: Digits,
  timeSec: number,
  guesses: number,
): Promise<{ wasBest: boolean; record: Record }> {
  const records = await getRecords();
  const prev = records[digits];
  const wasBest = isNewBest(prev?.bestTimeSec, timeSec);
  const record: Record = wasBest
    ? { bestTimeSec: timeSec, guesses, dateISO: new Date().toISOString() }
    : prev!;
  if (wasBest) {
    records[digits] = record;
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }
  return { wasBest, record };
}

export async function clearRecords(): Promise<void> {
  await AsyncStorage.removeItem(RECORDS_KEY);
}

export async function getSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
