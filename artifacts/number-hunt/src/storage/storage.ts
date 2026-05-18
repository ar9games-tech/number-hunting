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
  /** User-chosen nickname (no "#" — the serial is stored separately). */
  playerName: string;
  /**
   * 5-digit system-generated identifier. Combined with `playerName` to
   * form the display identity ("Ahmed #48291"). Read-only from the UI —
   * the user can never edit this.
   */
  playerSerial: string;
  /** False on a brand-new install so the welcome screen runs once. */
  hasOnboarded: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  themeMode: "system",
  allowLeadingZero: false,
  soundOn: true,
  hapticsOn: true,
  language: "en",
  playerName: "",
  playerSerial: "",
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

    // Migration A: legacy single-string identity. Older builds stored
    // both the nickname and serial in `playerName` as e.g. "Player #1234".
    // Split them so the new two-field UI works.
    let { playerName, playerSerial } = parsed;
    let migrated = false;
    if (playerName && !playerSerial) {
      const m = /^(.+?)\s*#\s*(\d{1,8})\s*$/.exec(playerName);
      if (m) {
        playerName = (m[1] ?? "").trim();
        playerSerial = (m[2] ?? "").padStart(5, "0").slice(-5);
        migrated = true;
      }
    }
    // Migration B: any existing install missing the serial should get a
    // fresh one silently so they never see a broken identity card.
    if (!playerSerial) {
      playerSerial = generateSerial();
      migrated = true;
    }

    // Migration C: pre-Wave-C installs don't have hasOnboarded. If they
    // have a payload at all they've already used the app, so treat as
    // onboarded unless the field is explicitly false in storage.
    const hasOnboarded = parsed.hasOnboarded ?? true;
    if (parsed.hasOnboarded === undefined) migrated = true;

    const result: Settings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      playerName: playerName ?? "",
      playerSerial,
      hasOnboarded,
    };

    // Persist the migrated payload so the freshly generated serial (or
    // split nickname) is stable across cold starts — otherwise we'd hand
    // out a different serial every launch until the user next changed a
    // setting.
    if (migrated) {
      void saveSettings(result).catch(() => {});
    }

    return result;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Generate a 5-digit system serial. The serial is opaque — it's only ever
 * displayed prefixed by "#" alongside the user's nickname. Using 10000-99999
 * gives ~90k unique values per install which is comfortably enough for
 * casual room identification without leaking anything sensitive.
 */
export function generateSerial(): string {
  const n = Math.floor(10000 + Math.random() * 90000);
  return String(n);
}

/**
 * Compose the public identity string shown wherever the player is named:
 * room screen, online lobby, future scoreboards. Falls back gracefully
 * when either piece is missing so we never render "undefined" or " #".
 */
export function formatPlayerIdentity(name: string, serial: string): string {
  const n = (name ?? "").trim();
  const s = (serial ?? "").trim();
  if (!n && !s) return "";
  if (!s) return n;
  if (!n) return `#${s}`;
  return `${n} #${s}`;
}
