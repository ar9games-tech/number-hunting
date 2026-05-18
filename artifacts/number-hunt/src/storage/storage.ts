import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ACHIEVEMENTS,
  evaluateUnlocks,
  type WinEvent,
} from "@/src/achievements/catalog";
import { isNewBest } from "@/src/utils/scoring";
import type { Digits } from "@/src/utils/gameLogic";

const RECORDS_KEY = "number-hunt:records:v1";
const SETTINGS_KEY = "number-hunt:settings:v1";
const STATS_KEY = "number-hunt:stats:v1";
const ACH_KEY = "number-hunt:achievements:v1";

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
  /** False on a brand-new install so the welcome screen runs once. */
  hasOnboarded: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  themeMode: "system",
  allowLeadingZero: false,
  soundOn: true,
  hapticsOn: true,
  language: "en",
  // Empty by default — the welcome screen generates a Player #NNNN serial
  // for the user to accept or edit on first launch.
  playerName: "",
  hasOnboarded: false,
};

// ---------------------------------------------------------------------------
// Lifetime stats — aggregates across every finished game.
// ---------------------------------------------------------------------------

export type DigitStats = {
  wins: number;
  totalGuessesWon: number;
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
 * Builds a fresh zeroed Stats object every call. Callers (recordWin /
 * recordLoss) mutate the returned object — sharing nested references would
 * leak mutations back into the "default" and break clearStats semantics.
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

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export type Achievements = {
  unlockedIds: string[];
  /** id -> ISO unlock timestamp. */
  unlockedAt: { [id: string]: string };
};

export function createDefaultAchievements(): Achievements {
  return { unlockedIds: [], unlockedAt: {} };
}

export const DEFAULT_ACHIEVEMENTS: Achievements = createDefaultAchievements();

function mergeAchievements(raw: Partial<Achievements> | null | undefined): Achievements {
  const base = createDefaultAchievements();
  if (!raw) return base;
  return {
    unlockedIds: Array.isArray(raw.unlockedIds) ? [...raw.unlockedIds] : base.unlockedIds,
    unlockedAt: { ...base.unlockedAt, ...(raw.unlockedAt ?? {}) },
  };
}

export async function getAchievements(): Promise<Achievements> {
  try {
    const raw = await AsyncStorage.getItem(ACH_KEY);
    if (!raw) return mergeAchievements(null);
    return mergeAchievements(JSON.parse(raw) as Partial<Achievements>);
  } catch {
    return mergeAchievements(null);
  }
}

async function saveAchievements(a: Achievements): Promise<void> {
  await AsyncStorage.setItem(ACH_KEY, JSON.stringify(a));
}

export async function clearAchievements(): Promise<void> {
  await AsyncStorage.removeItem(ACH_KEY);
}

// ---------------------------------------------------------------------------
// Outcome recorders
// ---------------------------------------------------------------------------

/**
 * Record a winning game. Bumps lifetime aggregates, evaluates the
 * achievement catalog against the post-update stats + win event, and
 * persists any newly unlocked IDs.
 *
 * Returns the new stats plus the IDs that were just unlocked (so the
 * caller — solo screen, result screen — can surface a banner).
 */
export async function recordWin(
  event: WinEvent,
): Promise<{ stats: Stats; newUnlocks: string[] }> {
  const stats = await getStats();
  stats.gamesPlayed += 1;
  stats.wins += 1;
  stats.currentStreak += 1;
  if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
  const pd = stats.perDigit[event.digits];
  pd.wins += 1;
  pd.totalGuessesWon += event.guesses;
  await saveStats(stats);

  const ach = await getAchievements();
  const newUnlocks = evaluateUnlocks(stats, event, ach.unlockedIds);
  if (newUnlocks.length > 0) {
    const nowISO = new Date().toISOString();
    ach.unlockedIds = [...ach.unlockedIds, ...newUnlocks];
    for (const id of newUnlocks) ach.unlockedAt[id] = nowISO;
    await saveAchievements(ach);
  }

  return { stats, newUnlocks };
}

/**
 * Record a lost game. Bumps games + losses and resets the current streak.
 * Losses do not unlock achievements in this catalog, but the function
 * still returns the (empty) unlock array for symmetry with recordWin.
 */
export async function recordLoss(): Promise<{ stats: Stats; newUnlocks: string[] }> {
  const stats = await getStats();
  stats.gamesPlayed += 1;
  stats.losses += 1;
  stats.currentStreak = 0;
  await saveStats(stats);
  return { stats, newUnlocks: [] };
}

export async function clearStats(): Promise<void> {
  await AsyncStorage.removeItem(STATS_KEY);
}

/** Re-export the WinEvent type so callers don't need to know about catalog. */
export type { WinEvent };
/** Re-export the catalog for screens that render the badge grid. */
export { ACHIEVEMENTS };

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

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      // Brand-new install — DEFAULT_SETTINGS has hasOnboarded=false so the
      // welcome screen runs.
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<Settings>;
    // Migration: pre-Wave-C installs don't have hasOnboarded. If they have a
    // payload at all they've already used the app, so treat as onboarded
    // unless the field is explicitly false in storage.
    const hasOnboarded = parsed.hasOnboarded ?? true;
    return { ...DEFAULT_SETTINGS, ...parsed, hasOnboarded };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Generate a friendly "Player #1234" style serial. The prefix is passed in
 * so the caller can localize it (e.g. "اللاعب" for Arabic). The 4-digit
 * suffix keeps casual collisions rare without making the name awkward.
 */
export function generatePlayerSerial(prefix: string): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${prefix} #${n}`;
}
