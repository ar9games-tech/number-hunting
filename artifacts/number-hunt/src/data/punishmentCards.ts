/**
 * Punishment card catalogue — single source of truth for the 4 cards that
 * the multiplayer "Punishment" feature can draw. The card IDs match the
 * server's `PUNISHMENT_CARDS` list in `artifacts/api-server/src/ws/game.ts`;
 * keep them in sync.
 *
 * Localized titles + subtext come from i18n via `titleKey` / `bodyKey`, not
 * hard-coded here, so EN/AR both render correctly with proper RTL.
 */
import type { PunishmentCardId } from "@/src/net/socketPlaceholder";
import type { TranslationKey } from "@/src/i18n/translations";

export type PunishmentCard = {
  id: PunishmentCardId;
  /** Big cartoon emoji used as the card "art". Family-friendly only. */
  emoji: string;
  /**
   * Tailwind-ish hint tones — actual hex comes from the theme. `success`
   * is reserved for the forgiving `anotherChance` card so the reveal
   * glows green instead of the usual red/orange threat colors.
   */
  tone: "destructive" | "primary" | "accent" | "warning" | "success";
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
};

export const PUNISHMENT_CARDS: Record<PunishmentCardId, PunishmentCard> = {
  directElimination: {
    id: "directElimination",
    emoji: "🚫",
    tone: "destructive",
    titleKey: "punishment.card.directElimination.title",
    bodyKey: "punishment.card.directElimination.body",
  },
  vote: {
    id: "vote",
    emoji: "🗳️",
    tone: "primary",
    titleKey: "punishment.card.vote.title",
    bodyKey: "punishment.card.vote.body",
  },
  anotherChance: {
    id: "anotherChance",
    emoji: "🕊️",
    tone: "success",
    titleKey: "punishment.card.anotherChance.title",
    bodyKey: "punishment.card.anotherChance.body",
  },
  chooseAnother: {
    id: "chooseAnother",
    emoji: "🔀",
    tone: "accent",
    titleKey: "punishment.card.chooseAnother.title",
    bodyKey: "punishment.card.chooseAnother.body",
  },
};

export function getPunishmentCard(id: PunishmentCardId): PunishmentCard {
  return PUNISHMENT_CARDS[id];
}
