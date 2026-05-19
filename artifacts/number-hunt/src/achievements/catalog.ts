import type { Feather } from "@expo/vector-icons";

import type { TranslationKey } from "@/src/i18n/translations";
import type { Stats } from "@/src/storage/storage";
import type { Digits } from "@/src/utils/gameLogic";

/**
 * The event payload passed to achievement tests when a game is won.
 * Solo wins include a non-null timeSec; online wins set it to null
 * because the server-driven race doesn't expose a per-player timer.
 *
 * `opponentCount` is set for online wins (number of opponents present,
 * excluding self). `fromRandomMatch` is true when the online match
 * originated from the Random Match queue.
 */
export type WinEvent = {
  mode: "solo" | "online";
  digits: Digits;
  guesses: number;
  timeSec: number | null;
  opponentCount?: number;
  fromRandomMatch?: boolean;
};

export type AchievementTone = "primary" | "success" | "warning" | "danger" | "accent";

export type AchievementTier = "bronze" | "silver" | "gold" | "diamond" | "legendary";

export const TIER_ORDER: readonly AchievementTier[] = [
  "bronze",
  "silver",
  "gold",
  "diamond",
  "legendary",
];

export type AchievementDef = {
  id: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: keyof typeof Feather.glyphMap;
  tone: AchievementTone;
  tier: AchievementTier;
  /**
   * Returns true when the achievement should unlock given the post-update
   * stats and (optionally) the triggering event. Conditions are evaluated
   * *after* stats have been updated, so e.g. checking `stats.wins >= 25`
   * works. `event` is undefined for non-win triggers (random match used,
   * punishment given/received, solo game started).
   */
  test: (stats: Stats, event?: WinEvent) => boolean;
  /**
   * Optional progress reporter for locked achievements. Returns a
   * {current, target} pair to render a progress bar. Omit for achievements
   * whose progress isn't meaningfully a fraction (e.g. event-triggered).
   */
  progress?: (stats: Stats) => { current: number; target: number };
};

const distinctDigitsWon = (s: Stats): number =>
  ([2, 3, 4] as const).filter((d) => s.perDigit[d].wins > 0).length;

const trifectaMin = (s: Stats, n: number): number =>
  Math.min(s.perDigit[2].wins, s.perDigit[3].wins, s.perDigit[4].wins) >= n
    ? 1
    : 0;

/**
 * Ordered catalog of 50 achievements grouped by tier (Bronze → Legendary).
 * Achievements are evaluated in this order; new IDs may be added freely
 * without affecting previously-unlocked records.
 *
 * Keep IDs stable — they're persisted in AsyncStorage by name. Renaming
 * an ID would orphan a user's unlock. The eleven IDs that pre-date the
 * tiered expansion are preserved verbatim: first_win, online_win,
 * streak_5, streak_10, wins_25, wins_100, fast_2, fast_3, fast_4,
 * sniper_3, sniper_4.
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ---------------------------------------------------------------------
  // BRONZE — easy / introductory
  // ---------------------------------------------------------------------
  {
    id: "first_solo",
    titleKey: "ach.first_solo.title",
    descKey: "ach.first_solo.desc",
    icon: "play",
    tone: "primary",
    tier: "bronze",
    test: (s) => s.soloPlayed >= 1,
    progress: (s) => ({ current: Math.min(s.soloPlayed, 1), target: 1 }),
  },
  {
    id: "first_win",
    titleKey: "ach.first_win.title",
    descKey: "ach.first_win.desc",
    icon: "award",
    tone: "success",
    tier: "bronze",
    test: (s) => s.wins >= 1,
    progress: (s) => ({ current: Math.min(s.wins, 1), target: 1 }),
  },
  {
    id: "online_win",
    titleKey: "ach.online_win.title",
    descKey: "ach.online_win.desc",
    icon: "users",
    tone: "primary",
    tier: "bronze",
    test: (_s, e) => e?.mode === "online",
  },
  {
    id: "wins_3",
    titleKey: "ach.wins_3.title",
    descKey: "ach.wins_3.desc",
    icon: "check-circle",
    tone: "success",
    tier: "bronze",
    test: (s) => s.wins >= 3,
    progress: (s) => ({ current: Math.min(s.wins, 3), target: 3 }),
  },
  {
    id: "online_wins_3",
    titleKey: "ach.online_wins_3.title",
    descKey: "ach.online_wins_3.desc",
    icon: "users",
    tone: "primary",
    tier: "bronze",
    test: (s) => s.onlineWins >= 3,
    progress: (s) => ({ current: Math.min(s.onlineWins, 3), target: 3 }),
  },
  {
    id: "plays_5",
    titleKey: "ach.plays_5.title",
    descKey: "ach.plays_5.desc",
    icon: "play-circle",
    tone: "primary",
    tier: "bronze",
    test: (s) => s.gamesPlayed >= 5,
    progress: (s) => ({ current: Math.min(s.gamesPlayed, 5), target: 5 }),
  },
  {
    id: "win_2digit",
    titleKey: "ach.win_2digit.title",
    descKey: "ach.win_2digit.desc",
    icon: "hash",
    tone: "success",
    tier: "bronze",
    test: (s) => s.perDigit[2].wins >= 1,
    progress: (s) => ({ current: Math.min(s.perDigit[2].wins, 1), target: 1 }),
  },
  {
    id: "win_3digit",
    titleKey: "ach.win_3digit.title",
    descKey: "ach.win_3digit.desc",
    icon: "hash",
    tone: "warning",
    tier: "bronze",
    test: (s) => s.perDigit[3].wins >= 1,
    progress: (s) => ({ current: Math.min(s.perDigit[3].wins, 1), target: 1 }),
  },
  {
    id: "guesses_50",
    titleKey: "ach.guesses_50.title",
    descKey: "ach.guesses_50.desc",
    icon: "edit-3",
    tone: "primary",
    tier: "bronze",
    test: (s) => s.totalGuesses >= 50,
    progress: (s) => ({ current: Math.min(s.totalGuesses, 50), target: 50 }),
  },
  {
    id: "fast_2",
    titleKey: "ach.fast_2.title",
    descKey: "ach.fast_2.desc",
    icon: "clock",
    tone: "success",
    tier: "bronze",
    test: (_s, e) => e?.digits === 2 && e.timeSec != null && e.timeSec <= 15,
  },
  {
    id: "solo_5",
    titleKey: "ach.solo_5.title",
    descKey: "ach.solo_5.desc",
    icon: "user",
    tone: "primary",
    tier: "bronze",
    test: (s) => s.soloPlayed >= 5,
    progress: (s) => ({ current: Math.min(s.soloPlayed, 5), target: 5 }),
  },
  {
    id: "streak_3",
    titleKey: "ach.streak_3.title",
    descKey: "ach.streak_3.desc",
    icon: "zap",
    tone: "warning",
    tier: "bronze",
    test: (s) => s.bestStreak >= 3,
    progress: (s) => ({ current: Math.min(s.bestStreak, 3), target: 3 }),
  },

  // ---------------------------------------------------------------------
  // SILVER — medium
  // ---------------------------------------------------------------------
  {
    id: "wins_10",
    titleKey: "ach.wins_10.title",
    descKey: "ach.wins_10.desc",
    icon: "trending-up",
    tone: "primary",
    tier: "silver",
    test: (s) => s.wins >= 10,
    progress: (s) => ({ current: Math.min(s.wins, 10), target: 10 }),
  },
  {
    id: "online_wins_10",
    titleKey: "ach.online_wins_10.title",
    descKey: "ach.online_wins_10.desc",
    icon: "users",
    tone: "primary",
    tier: "silver",
    test: (s) => s.onlineWins >= 10,
    progress: (s) => ({ current: Math.min(s.onlineWins, 10), target: 10 }),
  },
  {
    id: "streak_5",
    titleKey: "ach.streak_5.title",
    descKey: "ach.streak_5.desc",
    icon: "zap",
    tone: "warning",
    tier: "silver",
    test: (s) => s.bestStreak >= 5,
    progress: (s) => ({ current: Math.min(s.bestStreak, 5), target: 5 }),
  },
  {
    id: "win_4digit",
    titleKey: "ach.win_4digit.title",
    descKey: "ach.win_4digit.desc",
    icon: "hash",
    tone: "accent",
    tier: "silver",
    test: (s) => s.perDigit[4].wins >= 1,
    progress: (s) => ({ current: Math.min(s.perDigit[4].wins, 1), target: 1 }),
  },
  {
    id: "fast_3",
    titleKey: "ach.fast_3.title",
    descKey: "ach.fast_3.desc",
    icon: "clock",
    tone: "warning",
    tier: "silver",
    test: (_s, e) => e?.digits === 3 && e.timeSec != null && e.timeSec <= 30,
  },
  {
    id: "fast_3_60",
    titleKey: "ach.fast_3_60.title",
    descKey: "ach.fast_3_60.desc",
    icon: "clock",
    tone: "success",
    tier: "silver",
    test: (_s, e) => e?.digits === 3 && e.timeSec != null && e.timeSec <= 60,
  },
  {
    id: "guesses_100",
    titleKey: "ach.guesses_100.title",
    descKey: "ach.guesses_100.desc",
    icon: "edit-3",
    tone: "primary",
    tier: "silver",
    test: (s) => s.totalGuesses >= 100,
    progress: (s) => ({ current: Math.min(s.totalGuesses, 100), target: 100 }),
  },
  {
    id: "plays_20",
    titleKey: "ach.plays_20.title",
    descKey: "ach.plays_20.desc",
    icon: "play-circle",
    tone: "primary",
    tier: "silver",
    test: (s) => s.gamesPlayed >= 20,
    progress: (s) => ({ current: Math.min(s.gamesPlayed, 20), target: 20 }),
  },
  {
    id: "sniper_3",
    titleKey: "ach.sniper_3.title",
    descKey: "ach.sniper_3.desc",
    icon: "crosshair",
    tone: "warning",
    tier: "silver",
    test: (_s, e) => e?.digits === 3 && e.guesses <= 5,
  },
  {
    id: "random_used_1",
    titleKey: "ach.random_used_1.title",
    descKey: "ach.random_used_1.desc",
    icon: "shuffle",
    tone: "primary",
    tier: "silver",
    test: (s) => s.randomMatchesUsed >= 1,
    progress: (s) => ({
      current: Math.min(s.randomMatchesUsed, 1),
      target: 1,
    }),
  },
  {
    id: "punish_used_1",
    titleKey: "ach.punish_used_1.title",
    descKey: "ach.punish_used_1.desc",
    icon: "alert-octagon",
    tone: "danger",
    tier: "silver",
    test: (s) => s.punishmentsGiven >= 1,
    progress: (s) => ({
      current: Math.min(s.punishmentsGiven, 1),
      target: 1,
    }),
  },
  {
    id: "punish_received_1",
    titleKey: "ach.punish_received_1.title",
    descKey: "ach.punish_received_1.desc",
    icon: "frown",
    tone: "danger",
    tier: "silver",
    test: (s) => s.punishmentsReceived >= 1,
    progress: (s) => ({
      current: Math.min(s.punishmentsReceived, 1),
      target: 1,
    }),
  },

  // ---------------------------------------------------------------------
  // GOLD — hard
  // ---------------------------------------------------------------------
  {
    id: "wins_25",
    titleKey: "ach.wins_25.title",
    descKey: "ach.wins_25.desc",
    icon: "target",
    tone: "primary",
    tier: "gold",
    test: (s) => s.wins >= 25,
    progress: (s) => ({ current: Math.min(s.wins, 25), target: 25 }),
  },
  {
    id: "online_wins_25",
    titleKey: "ach.online_wins_25.title",
    descKey: "ach.online_wins_25.desc",
    icon: "users",
    tone: "primary",
    tier: "gold",
    test: (s) => s.onlineWins >= 25,
    progress: (s) => ({ current: Math.min(s.onlineWins, 25), target: 25 }),
  },
  {
    id: "fast_2_5",
    titleKey: "ach.fast_2_5.title",
    descKey: "ach.fast_2_5.desc",
    icon: "clock",
    tone: "accent",
    tier: "gold",
    test: (_s, e) => e?.digits === 2 && e.timeSec != null && e.timeSec <= 5,
  },
  {
    id: "fast_3_15",
    titleKey: "ach.fast_3_15.title",
    descKey: "ach.fast_3_15.desc",
    icon: "clock",
    tone: "accent",
    tier: "gold",
    test: (_s, e) => e?.digits === 3 && e.timeSec != null && e.timeSec <= 15,
  },
  {
    id: "fast_4",
    titleKey: "ach.fast_4.title",
    descKey: "ach.fast_4.desc",
    icon: "clock",
    tone: "accent",
    tier: "gold",
    test: (_s, e) => e?.digits === 4 && e.timeSec != null && e.timeSec <= 60,
  },
  {
    id: "sniper_4",
    titleKey: "ach.sniper_4.title",
    descKey: "ach.sniper_4.desc",
    icon: "eye",
    tone: "accent",
    tier: "gold",
    test: (_s, e) => e?.digits === 4 && e.guesses <= 8,
  },
  {
    id: "random_used_5",
    titleKey: "ach.random_used_5.title",
    descKey: "ach.random_used_5.desc",
    icon: "shuffle",
    tone: "primary",
    tier: "gold",
    test: (s) => s.randomMatchesUsed >= 5,
    progress: (s) => ({
      current: Math.min(s.randomMatchesUsed, 5),
      target: 5,
    }),
  },
  {
    id: "random_win",
    titleKey: "ach.random_win.title",
    descKey: "ach.random_win.desc",
    icon: "shuffle",
    tone: "success",
    tier: "gold",
    test: (s) => s.randomMatchWins >= 1,
    progress: (s) => ({ current: Math.min(s.randomMatchWins, 1), target: 1 }),
  },
  {
    id: "plays_50",
    titleKey: "ach.plays_50.title",
    descKey: "ach.plays_50.desc",
    icon: "play-circle",
    tone: "primary",
    tier: "gold",
    test: (s) => s.gamesPlayed >= 50,
    progress: (s) => ({ current: Math.min(s.gamesPlayed, 50), target: 50 }),
  },
  {
    id: "guesses_500",
    titleKey: "ach.guesses_500.title",
    descKey: "ach.guesses_500.desc",
    icon: "edit-3",
    tone: "warning",
    tier: "gold",
    test: (s) => s.totalGuesses >= 500,
    progress: (s) => ({ current: Math.min(s.totalGuesses, 500), target: 500 }),
  },
  {
    id: "all_digits",
    titleKey: "ach.all_digits.title",
    descKey: "ach.all_digits.desc",
    icon: "layers",
    tone: "accent",
    tier: "gold",
    test: (s) => distinctDigitsWon(s) >= 3,
    progress: (s) => ({ current: distinctDigitsWon(s), target: 3 }),
  },

  // ---------------------------------------------------------------------
  // DIAMOND — very hard
  // ---------------------------------------------------------------------
  {
    id: "wins_50",
    titleKey: "ach.wins_50.title",
    descKey: "ach.wins_50.desc",
    icon: "trending-up",
    tone: "accent",
    tier: "diamond",
    test: (s) => s.wins >= 50,
    progress: (s) => ({ current: Math.min(s.wins, 50), target: 50 }),
  },
  {
    id: "online_wins_50",
    titleKey: "ach.online_wins_50.title",
    descKey: "ach.online_wins_50.desc",
    icon: "users",
    tone: "accent",
    tier: "diamond",
    test: (s) => s.onlineWins >= 50,
    progress: (s) => ({ current: Math.min(s.onlineWins, 50), target: 50 }),
  },
  {
    id: "streak_10",
    titleKey: "ach.streak_10.title",
    descKey: "ach.streak_10.desc",
    icon: "star",
    tone: "accent",
    tier: "diamond",
    test: (s) => s.bestStreak >= 10,
    progress: (s) => ({ current: Math.min(s.bestStreak, 10), target: 10 }),
  },
  {
    id: "fast_4_30",
    titleKey: "ach.fast_4_30.title",
    descKey: "ach.fast_4_30.desc",
    icon: "clock",
    tone: "accent",
    tier: "diamond",
    test: (_s, e) => e?.digits === 4 && e.timeSec != null && e.timeSec <= 30,
  },
  {
    id: "sniper_4_5",
    titleKey: "ach.sniper_4_5.title",
    descKey: "ach.sniper_4_5.desc",
    icon: "eye",
    tone: "accent",
    tier: "diamond",
    test: (_s, e) => e?.digits === 4 && e.guesses <= 5,
  },
  {
    id: "plays_100",
    titleKey: "ach.plays_100.title",
    descKey: "ach.plays_100.desc",
    icon: "play-circle",
    tone: "accent",
    tier: "diamond",
    test: (s) => s.gamesPlayed >= 100,
    progress: (s) => ({ current: Math.min(s.gamesPlayed, 100), target: 100 }),
  },
  {
    id: "guesses_1000",
    titleKey: "ach.guesses_1000.title",
    descKey: "ach.guesses_1000.desc",
    icon: "edit-3",
    tone: "accent",
    tier: "diamond",
    test: (s) => s.totalGuesses >= 1000,
    progress: (s) => ({
      current: Math.min(s.totalGuesses, 1000),
      target: 1000,
    }),
  },
  {
    id: "wins_4plus",
    titleKey: "ach.wins_4plus.title",
    descKey: "ach.wins_4plus.desc",
    icon: "users",
    tone: "accent",
    tier: "diamond",
    test: (s) => s.maxOpponentsWon >= 4,
    progress: (s) => ({ current: Math.min(s.maxOpponentsWon, 4), target: 4 }),
  },
  {
    id: "random_wins_5",
    titleKey: "ach.random_wins_5.title",
    descKey: "ach.random_wins_5.desc",
    icon: "shuffle",
    tone: "accent",
    tier: "diamond",
    test: (s) => s.randomMatchWins >= 5,
    progress: (s) => ({ current: Math.min(s.randomMatchWins, 5), target: 5 }),
  },
  {
    id: "punish_given_5",
    titleKey: "ach.punish_given_5.title",
    descKey: "ach.punish_given_5.desc",
    icon: "alert-octagon",
    tone: "danger",
    tier: "diamond",
    test: (s) => s.punishmentsGiven >= 5,
    progress: (s) => ({
      current: Math.min(s.punishmentsGiven, 5),
      target: 5,
    }),
  },

  // ---------------------------------------------------------------------
  // LEGENDARY — rare
  // ---------------------------------------------------------------------
  {
    id: "wins_100",
    titleKey: "ach.wins_100.title",
    descKey: "ach.wins_100.desc",
    icon: "award",
    tone: "accent",
    tier: "legendary",
    test: (s) => s.wins >= 100,
    progress: (s) => ({ current: Math.min(s.wins, 100), target: 100 }),
  },
  {
    id: "online_wins_100",
    titleKey: "ach.online_wins_100.title",
    descKey: "ach.online_wins_100.desc",
    icon: "users",
    tone: "accent",
    tier: "legendary",
    test: (s) => s.onlineWins >= 100,
    progress: (s) => ({ current: Math.min(s.onlineWins, 100), target: 100 }),
  },
  {
    id: "streak_15",
    titleKey: "ach.streak_15.title",
    descKey: "ach.streak_15.desc",
    icon: "star",
    tone: "accent",
    tier: "legendary",
    test: (s) => s.bestStreak >= 15,
    progress: (s) => ({ current: Math.min(s.bestStreak, 15), target: 15 }),
  },
  {
    id: "fast_4_15",
    titleKey: "ach.fast_4_15.title",
    descKey: "ach.fast_4_15.desc",
    icon: "clock",
    tone: "accent",
    tier: "legendary",
    test: (_s, e) => e?.digits === 4 && e.timeSec != null && e.timeSec <= 15,
  },
  {
    id: "trifecta_25",
    titleKey: "ach.trifecta_25.title",
    descKey: "ach.trifecta_25.desc",
    icon: "layers",
    tone: "accent",
    tier: "legendary",
    test: (s) => trifectaMin(s, 25) >= 1,
    progress: (s) => ({
      current: Math.min(
        s.perDigit[2].wins,
        s.perDigit[3].wins,
        s.perDigit[4].wins,
      ),
      target: 25,
    }),
  },
];

/** O(1) lookup for use in the result banner and badge grid. */
const BY_ID: { [id: string]: AchievementDef } = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export function getAchievementDef(id: string): AchievementDef | undefined {
  return BY_ID[id];
}

/**
 * Run every catalog test against the post-update stats + event and return
 * the IDs that should now be unlocked but aren't already in `alreadyUnlocked`.
 * The order of the returned array matches the catalog order so banners
 * render predictably. `event` is undefined for non-win triggers.
 */
export function evaluateUnlocks(
  stats: Stats,
  event: WinEvent | undefined,
  alreadyUnlocked: readonly string[],
): string[] {
  const already = new Set(alreadyUnlocked);
  const out: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (already.has(def.id)) continue;
    try {
      if (def.test(stats, event)) out.push(def.id);
    } catch {
      // A buggy test should never crash the post-win flow; skip silently.
    }
  }
  return out;
}
