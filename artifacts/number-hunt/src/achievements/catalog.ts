import type { Feather } from "@expo/vector-icons";

import type { TranslationKey } from "@/src/i18n/translations";
import type { Stats } from "@/src/storage/storage";
import type { Digits } from "@/src/utils/gameLogic";

/**
 * The event payload passed to achievement tests when a game is won.
 * Solo wins include a non-null timeSec; online wins set it to null
 * because the server-driven race doesn't expose a per-player timer.
 */
export type WinEvent = {
  mode: "solo" | "online";
  digits: Digits;
  guesses: number;
  timeSec: number | null;
};

export type AchievementTone = "primary" | "success" | "warning" | "danger" | "accent";

export type AchievementDef = {
  id: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: keyof typeof Feather.glyphMap;
  tone: AchievementTone;
  /**
   * Returns true when the achievement should unlock given the post-win
   * stats and the triggering event. Conditions are evaluated *after*
   * stats have been updated, so e.g. checking `stats.wins >= 25` works.
   */
  test: (stats: Stats, event: WinEvent) => boolean;
};

/**
 * Ordered catalog. Achievements are evaluated in this order; new IDs
 * may be added freely without affecting previously-unlocked records.
 *
 * Keep IDs stable — they're persisted in AsyncStorage by name. Renaming
 * an ID would orphan a user's unlock.
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "first_win",
    titleKey: "ach.first_win.title",
    descKey: "ach.first_win.desc",
    icon: "award",
    tone: "success",
    // Strict equality so this only fires on the very first win after a
    // fresh install (or full reset). evaluateUnlocks already skips
    // already-unlocked IDs, so this is a belt-and-suspenders guarantee.
    test: (s) => s.wins === 1,
  },
  {
    id: "online_win",
    titleKey: "ach.online_win.title",
    descKey: "ach.online_win.desc",
    icon: "users",
    tone: "primary",
    test: (_s, e) => e.mode === "online",
  },
  {
    id: "streak_5",
    titleKey: "ach.streak_5.title",
    descKey: "ach.streak_5.desc",
    icon: "zap",
    tone: "warning",
    test: (s) => s.bestStreak >= 5,
  },
  {
    id: "streak_10",
    titleKey: "ach.streak_10.title",
    descKey: "ach.streak_10.desc",
    icon: "star",
    tone: "accent",
    test: (s) => s.bestStreak >= 10,
  },
  {
    id: "wins_25",
    titleKey: "ach.wins_25.title",
    descKey: "ach.wins_25.desc",
    icon: "target",
    tone: "primary",
    test: (s) => s.wins >= 25,
  },
  {
    id: "wins_100",
    titleKey: "ach.wins_100.title",
    descKey: "ach.wins_100.desc",
    icon: "trending-up",
    tone: "accent",
    test: (s) => s.wins >= 100,
  },
  {
    id: "fast_2",
    titleKey: "ach.fast_2.title",
    descKey: "ach.fast_2.desc",
    icon: "clock",
    tone: "success",
    test: (_s, e) => e.digits === 2 && e.timeSec != null && e.timeSec <= 15,
  },
  {
    id: "fast_3",
    titleKey: "ach.fast_3.title",
    descKey: "ach.fast_3.desc",
    icon: "clock",
    tone: "warning",
    test: (_s, e) => e.digits === 3 && e.timeSec != null && e.timeSec <= 30,
  },
  {
    id: "fast_4",
    titleKey: "ach.fast_4.title",
    descKey: "ach.fast_4.desc",
    icon: "clock",
    tone: "accent",
    test: (_s, e) => e.digits === 4 && e.timeSec != null && e.timeSec <= 60,
  },
  {
    id: "sniper_3",
    titleKey: "ach.sniper_3.title",
    descKey: "ach.sniper_3.desc",
    icon: "crosshair",
    tone: "warning",
    test: (_s, e) => e.digits === 3 && e.guesses <= 5,
  },
  {
    id: "sniper_4",
    titleKey: "ach.sniper_4.title",
    descKey: "ach.sniper_4.desc",
    icon: "eye",
    tone: "accent",
    test: (_s, e) => e.digits === 4 && e.guesses <= 8,
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
 * render predictably.
 */
export function evaluateUnlocks(
  stats: Stats,
  event: WinEvent,
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
