import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ACHIEVEMENTS,
  evaluateUnlocks,
  type WinEvent,
} from "@/src/achievements/catalog";
import { isNewBest } from "@/src/utils/scoring";
import type { Digits } from "@/src/utils/gameLogic";

const RECORDS_KEY = "number-hunt:records:v2";
const RECORDS_KEY_LEGACY = "number-hunt:records:v1";
const SETTINGS_KEY = "number-hunt:settings:v1";
const STATS_KEY = "number-hunt:stats:v1";
const ONLINE_STATS_KEY = "number-hunt:online-stats:v1";
const ACH_KEY = "number-hunt:achievements:v1";
const PENDING_RANDOM_KEY = "number-hunt:pending-random:v1";
const PENDING_UNLOCKS_KEY = "number-hunt:pending-unlocks:v1";

export type Record = {
  bestTimeSec: number;
  guesses: number;
  dateISO: string;
};

/** Best run snapshot per digit length, for a single mode. */
export type ModeRecords = {
  2?: Record;
  3?: Record;
  4?: Record;
};

/**
 * Records are split by mode. Solo times are kept across solo runs;
 * Online times are kept across online wins. They never share a slot.
 */
export type Records = {
  solo: ModeRecords;
  online: ModeRecords;
};

export type RecordsMode = "solo" | "online";

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
// Lifetime stats
//
// `Stats` is the internal aggregate used by the achievement catalog — every
// win (solo OR online) updates it so the existing achievement tests keep
// firing as designed.
//
// `OnlineStats` is what we display on the Records and Profile screens.
// It is updated ONLY for online events, so the user-visible "lifetime stats"
// truly reflect online play only, as the product spec requires.
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
  // Achievement-feeding counters added with the 50-achievement expansion.
  // All default to 0 so previously-persisted Stats merge in cleanly.
  totalGuesses: number;
  soloPlayed: number;
  onlineWins: number;
  randomMatchesUsed: number;
  randomMatchWins: number;
  punishmentsGiven: number;
  punishmentsReceived: number;
  maxOpponentsWon: number;
};

export type OnlineStats = Stats;

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
    totalGuesses: 0,
    soloPlayed: 0,
    onlineWins: 0,
    randomMatchesUsed: 0,
    randomMatchWins: 0,
    punishmentsGiven: 0,
    punishmentsReceived: 0,
    maxOpponentsWon: 0,
  };
}

export const DEFAULT_STATS: Stats = createDefaultStats();
export const DEFAULT_ONLINE_STATS: OnlineStats = createDefaultStats();

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
    totalGuesses: raw.totalGuesses ?? base.totalGuesses,
    soloPlayed: raw.soloPlayed ?? base.soloPlayed,
    onlineWins: raw.onlineWins ?? base.onlineWins,
    randomMatchesUsed: raw.randomMatchesUsed ?? base.randomMatchesUsed,
    randomMatchWins: raw.randomMatchWins ?? base.randomMatchWins,
    punishmentsGiven: raw.punishmentsGiven ?? base.punishmentsGiven,
    punishmentsReceived: raw.punishmentsReceived ?? base.punishmentsReceived,
    maxOpponentsWon: raw.maxOpponentsWon ?? base.maxOpponentsWon,
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

export async function getOnlineStats(): Promise<OnlineStats> {
  try {
    const raw = await AsyncStorage.getItem(ONLINE_STATS_KEY);
    if (!raw) return mergeStats(null);
    return mergeStats(JSON.parse(raw) as Partial<OnlineStats>);
  } catch {
    return mergeStats(null);
  }
}

async function saveOnlineStats(stats: OnlineStats): Promise<void> {
  await AsyncStorage.setItem(ONLINE_STATS_KEY, JSON.stringify(stats));
}

export async function clearOnlineStats(): Promise<void> {
  await AsyncStorage.removeItem(ONLINE_STATS_KEY);
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export type Achievements = {
  unlockedIds: string[];
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
 * Record a winning game.
 *
 * - Always updates the internal `Stats` aggregate (so the existing
 *   achievement catalog keeps evaluating against the full play history).
 * - If the event is `online`, ALSO updates `OnlineStats` — the
 *   user-visible lifetime stats surface on the Records/Profile screens.
 *
 * Returns the new internal stats plus any IDs just unlocked.
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
  // Achievement-feeding counters: total guesses across all wins/losses;
  // online win count; random-match win count; max opponents present at win.
  stats.totalGuesses += event.guesses;
  if (event.mode === "online") {
    stats.onlineWins += 1;
    if (event.fromRandomMatch) stats.randomMatchWins += 1;
    if (typeof event.opponentCount === "number") {
      if (event.opponentCount > stats.maxOpponentsWon) {
        stats.maxOpponentsWon = event.opponentCount;
      }
    }
  }
  await saveStats(stats);

  if (event.mode === "online") {
    const os = await getOnlineStats();
    os.gamesPlayed += 1;
    os.wins += 1;
    os.currentStreak += 1;
    if (os.currentStreak > os.bestStreak) os.bestStreak = os.currentStreak;
    const opd = os.perDigit[event.digits];
    opd.wins += 1;
    opd.totalGuessesWon += event.guesses;
    await saveOnlineStats(os);
  }

  return persistUnlocks(stats, event);
}

/**
 * Record a lost game. Updates internal stats always; updates OnlineStats
 * only when the loss happened in an online round.
 */
export async function recordLoss(
  mode: "solo" | "online" = "online",
): Promise<{ stats: Stats; newUnlocks: string[] }> {
  const stats = await getStats();
  stats.gamesPlayed += 1;
  stats.losses += 1;
  stats.currentStreak = 0;
  await saveStats(stats);

  if (mode === "online") {
    const os = await getOnlineStats();
    os.gamesPlayed += 1;
    os.losses += 1;
    os.currentStreak = 0;
    await saveOnlineStats(os);
  }

  return { stats, newUnlocks: [] };
}

/**
 * Shared helper: evaluate the catalog against the just-updated `stats` and
 * persist any newly unlocked IDs. Used by every recorder so non-win events
 * (random match started, punishment given/received, solo game started)
 * can also unlock achievements.
 */
async function persistUnlocks(
  stats: Stats,
  event: WinEvent | undefined,
): Promise<{ stats: Stats; newUnlocks: string[] }> {
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
 * Bump a single non-win stats counter, persist, evaluate unlocks, and
 * enqueue any new unlocks so the next screen with a banner can surface
 * them. Shared by every non-win recorder so they all behave identically.
 */
async function recordNonWin(
  mutate: (stats: Stats) => void,
): Promise<{ newUnlocks: string[] }> {
  const stats = await getStats();
  mutate(stats);
  await saveStats(stats);
  const { newUnlocks } = await persistUnlocks(stats, undefined);
  if (newUnlocks.length > 0) {
    await enqueuePendingUnlocks(newUnlocks);
  }
  return { newUnlocks };
}

/** Bump the solo-played counter and evaluate non-win achievements. */
export async function recordSoloPlayed(): Promise<{ newUnlocks: string[] }> {
  return recordNonWin((s) => {
    s.soloPlayed += 1;
  });
}

/** Bump the random-match-used counter (called when matchmaking starts). */
export async function recordRandomMatchStarted(): Promise<{
  newUnlocks: string[];
}> {
  return recordNonWin((s) => {
    s.randomMatchesUsed += 1;
  });
}

/** Bump the punishment-given counter and evaluate non-win achievements. */
export async function recordPunishmentGiven(): Promise<{
  newUnlocks: string[];
}> {
  return recordNonWin((s) => {
    s.punishmentsGiven += 1;
  });
}

/** Bump the punishment-received counter and evaluate non-win achievements. */
export async function recordPunishmentReceived(): Promise<{
  newUnlocks: string[];
}> {
  return recordNonWin((s) => {
    s.punishmentsReceived += 1;
  });
}

export async function clearStats(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STATS_KEY),
    AsyncStorage.removeItem(ONLINE_STATS_KEY),
  ]);
}

/**
 * One-shot flag set by the lobby when a Random Match navigates into a room,
 * so the result screen can attribute the win to the random-match queue.
 * Consumed on next recordWin or when the user goes home.
 */
export async function setPendingRandomMatch(): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_RANDOM_KEY, "1");
  } catch {
    // Non-fatal: at worst the random_win achievement won't fire.
  }
}

export async function consumePendingRandomMatch(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(PENDING_RANDOM_KEY);
    if (v) await AsyncStorage.removeItem(PENDING_RANDOM_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

/**
 * Clear the random-match flag without consuming its value. Used on
 * terminal non-win paths (losses, leaving the room) so a stale flag from
 * a previous random match can't be misattributed to a later non-random
 * win.
 */
export async function clearPendingRandomMatch(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_RANDOM_KEY);
  } catch {
    // Non-fatal.
  }
}

/**
 * Queue of achievement ids unlocked outside the normal win flow
 * (recordSoloPlayed, recordRandomMatchStarted, etc.). The next screen
 * that renders the AchievementBanner consumes and surfaces them.
 */
async function enqueuePendingUnlocks(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const raw = await AsyncStorage.getItem(PENDING_UNLOCKS_KEY);
    const current: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    // De-duplicate while preserving order — same id can't be queued twice.
    const merged = Array.from(new Set([...current, ...ids]));
    await AsyncStorage.setItem(PENDING_UNLOCKS_KEY, JSON.stringify(merged));
  } catch {
    // Non-fatal: at worst the banner won't show for these unlocks.
  }
}

export async function consumePendingUnlocks(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_UNLOCKS_KEY);
    if (!raw) return [];
    await AsyncStorage.removeItem(PENDING_UNLOCKS_KEY);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

export type { WinEvent };
export { ACHIEVEMENTS };

// ---------------------------------------------------------------------------
// Records — single-best snapshot per (mode, digits)
// ---------------------------------------------------------------------------

function emptyRecords(): Records {
  return { solo: {}, online: {} };
}

/**
 * Read records. Migrates legacy v1 (flat `{2,3,4}`) into the new
 * `{ solo, online }` shape; legacy data is treated as solo since the
 * old game never separated them.
 */
export async function getRecords(): Promise<Records> {
  try {
    const raw = await AsyncStorage.getItem(RECORDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Records>;
      return {
        solo: { ...(parsed.solo ?? {}) },
        online: { ...(parsed.online ?? {}) },
      };
    }
    // Legacy migration: v1 shape was `{ 2?, 3?, 4? }` for solo only.
    const legacyRaw = await AsyncStorage.getItem(RECORDS_KEY_LEGACY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as ModeRecords;
      const migrated: Records = { solo: { ...legacy }, online: {} };
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return emptyRecords();
  } catch {
    return emptyRecords();
  }
}

/**
 * Update the per-mode best record if `timeSec` beats the prior best.
 * Returns whether it was a new record and the stored snapshot.
 */
export async function saveRecordIfBest(
  mode: RecordsMode,
  digits: Digits,
  timeSec: number,
  guesses: number,
): Promise<{ wasBest: boolean; record: Record }> {
  const records = await getRecords();
  const bucket = records[mode];
  const prev = bucket[digits];
  const wasBest = isNewBest(prev?.bestTimeSec, timeSec);
  const record: Record = wasBest
    ? { bestTimeSec: timeSec, guesses, dateISO: new Date().toISOString() }
    : prev!;
  if (wasBest) {
    bucket[digits] = record;
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }
  return { wasBest, record };
}

export async function clearRecords(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(RECORDS_KEY),
    AsyncStorage.removeItem(RECORDS_KEY_LEGACY),
  ]);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<Settings>;

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
    if (!playerSerial) {
      playerSerial = generateSerial();
      migrated = true;
    }

    const hasOnboarded = parsed.hasOnboarded ?? true;
    if (parsed.hasOnboarded === undefined) migrated = true;

    const result: Settings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      playerName: playerName ?? "",
      playerSerial,
      hasOnboarded,
    };

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

export function generateSerial(): string {
  const n = Math.floor(10000 + Math.random() * 90000);
  return String(n);
}

export function formatPlayerIdentity(name: string, serial: string): string {
  const n = (name ?? "").trim();
  const s = (serial ?? "").trim();
  if (!n && !s) return "";
  if (!s) return n;
  if (!n) return `#${s}`;
  return `${n} #${s}`;
}
