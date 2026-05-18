import { toEnglishDigits } from "@/src/utils/numberLocalization";

export type Digits = 2 | 3 | 4;

export type FeedbackLevel = "low" | "tooLow" | "high" | "tooHigh";

export type Feedback = {
  correct: boolean;
  level: FeedbackLevel | null;
  // null in modes that don't expose the count (e.g. online 2-digit).
  correctDigitCount: number | null;
};

export const DISTANCE_THRESHOLDS: Record<Digits, number> = {
  2: 10,
  3: 50,
  4: 200,
};

function isDigits(n: unknown): n is Digits {
  return n === 2 || n === 3 || n === 4;
}

/** Defensive normaliser used at every boundary. Accepts anything, returns an
 *  English-digit string ("" if input is null/undefined). Never throws. */
export function normalizeDigits(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return toEnglishDigits(String(value));
  } catch {
    return "";
  }
}

export function generateHidden(digits: Digits, allowLeadingZero: boolean): string {
  if (!isDigits(digits)) return "";
  let result = "";
  for (let i = 0; i < digits; i++) {
    let d: number;
    if (i === 0 && !allowLeadingZero) {
      d = 1 + Math.floor(Math.random() * 9);
    } else {
      d = Math.floor(Math.random() * 10);
    }
    result += d.toString();
  }
  return result;
}

/** Spec alias. */
export function generateHiddenNumber(digits: Digits, allowLeadingZero = false): string {
  return generateHidden(digits, allowLeadingZero);
}

/** True iff `guess` is a string of exactly `digits` English digits 0-9.
 *  Accepts unknown input safely — converts Arabic digits first. */
export function isValidGuess(guess: unknown, digits: unknown): boolean {
  if (!isDigits(digits)) return false;
  const g = normalizeDigits(guess);
  if (g.length !== digits) return false;
  return /^[0-9]+$/.test(g);
}

/** Spec alias for isValidGuess. */
export function validateGuess(guess: unknown, digits: unknown): boolean {
  return isValidGuess(guess, digits);
}

function countSharedDigits(a: string, b: string): number {
  const counts: Record<string, number> = {};
  for (const ch of a) counts[ch] = (counts[ch] ?? 0) + 1;
  let shared = 0;
  for (const ch of b) {
    if ((counts[ch] ?? 0) > 0) {
      shared++;
      counts[ch]!--;
    }
  }
  return shared;
}

/** Counts how many digits the guess shares with the hidden number,
 *  honouring repeats. Safe against missing/garbage input — returns 0. */
export function countCorrectDigits(guess: unknown, hidden: unknown): number {
  const g = normalizeDigits(guess);
  const h = normalizeDigits(hidden);
  if (!g || !h) return 0;
  return countSharedDigits(g, h);
}

/** Pure high/low feedback (no `correct`). Returns null on bad input. */
export function getHighLowFeedback(
  guess: unknown,
  hidden: unknown,
  digits: unknown,
): FeedbackLevel | null {
  if (!isDigits(digits)) return null;
  const g = normalizeDigits(guess);
  const h = normalizeDigits(hidden);
  if (g.length !== digits || h.length !== digits) return null;
  if (!/^[0-9]+$/.test(g) || !/^[0-9]+$/.test(h)) return null;
  if (g === h) return null;
  const gi = parseInt(g, 10);
  const hi = parseInt(h, 10);
  if (!Number.isFinite(gi) || !Number.isFinite(hi)) return null;
  const diff = Math.abs(gi - hi);
  const threshold = DISTANCE_THRESHOLDS[digits];
  if (gi < hi) return diff <= threshold ? "low" : "tooLow";
  return diff <= threshold ? "high" : "tooHigh";
}

/** Full feedback for a guess. Always returns a Feedback object; never throws.
 *  If inputs are invalid, returns a safe "incorrect with no level" sentinel. */
export function evaluateGuess(guess: unknown, hidden: unknown, digits: unknown): Feedback {
  const g = normalizeDigits(guess);
  const h = normalizeDigits(hidden);
  const safeDigits = isDigits(digits) ? digits : null;
  if (!safeDigits || g.length !== safeDigits || h.length !== safeDigits) {
    return { correct: false, level: null, correctDigitCount: 0 };
  }
  if (!/^[0-9]+$/.test(g) || !/^[0-9]+$/.test(h)) {
    return { correct: false, level: null, correctDigitCount: 0 };
  }
  const correct = g === h;
  const correctDigitCount = countSharedDigits(g, h);
  if (correct) {
    return { correct: true, level: null, correctDigitCount };
  }
  const level = getHighLowFeedback(g, h, safeDigits);
  return { correct: false, level, correctDigitCount };
}

export function feedbackLabel(level: FeedbackLevel | null, correct: boolean): string {
  if (correct) return "Correct!";
  switch (level) {
    case "low":
      return "Low";
    case "tooLow":
      return "Too Low";
    case "high":
      return "High";
    case "tooHigh":
      return "Too High";
    default:
      return "";
  }
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Re-export for convenience so callers can import everything from gameLogic.
export { toEnglishDigits };
