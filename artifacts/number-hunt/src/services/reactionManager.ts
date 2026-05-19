/**
 * Reaction catalog + cooldown constants.
 *
 * Reactions come in two flavors — emoji and short text. Emoji are
 * language-neutral; text reactions are localized (server just
 * broadcasts whatever literal string the sender picked, so an
 * English-speaking sender's "Close!" reaches an Arabic peer as-is).
 *
 * The server validates only length and presence — the catalog here is
 * client-only UI.
 */

import type { Language } from "@/src/storage/storage";

export const EMOJI_REACTIONS = ["😂", "😱", "🔥", "👀", "😎", "🎯", "💀", "🤯"] as const;
export type EmojiReaction = (typeof EMOJI_REACTIONS)[number];

export const TEXT_REACTIONS_EN = [
  "Close!",
  "No way!",
  "Almost!",
  "Lucky!",
  "Hurry up!",
  "Easy!",
  "GG!",
] as const;

export const TEXT_REACTIONS_AR = [
  "قريب!",
  "مستحيل!",
  "أوشكت!",
  "محظوظ!",
  "أسرع!",
  "سهلة!",
  "لعبة جيدة!",
] as const;

export function textReactionsFor(language: Language): readonly string[] {
  return language === "ar" ? TEXT_REACTIONS_AR : TEXT_REACTIONS_EN;
}

/** Per-player cooldown between sends. Enforced on client + server. */
export const REACTION_COOLDOWN_MS = 3000;

/** How long a single floating reaction lives on-screen. */
export const REACTION_DISPLAY_MS = 2600;

/** Soft cap on how many can stack at once before old ones get culled. */
export const REACTION_MAX_STACK = 6;

/** Max length the server will accept for the literal reaction string. */
export const REACTION_MAX_LEN = 64;

/**
 * Heuristic — true if the string is short enough and starts with a
 * symbol/emoji we'd want to render larger with a glow. The simple
 * length check covers our 8 single-grapheme emoji while excluding the
 * multi-word text reactions ("Close!", "لعبة جيدة!").
 */
export function looksLikeEmoji(reaction: string): boolean {
  return [...reaction].length <= 2;
}

export function isValidReaction(s: unknown): s is string {
  return typeof s === "string" && s.length > 0 && s.length <= REACTION_MAX_LEN;
}
