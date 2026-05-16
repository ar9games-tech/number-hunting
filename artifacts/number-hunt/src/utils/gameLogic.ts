export type Digits = 2 | 3 | 4;

export type FeedbackLevel = "low" | "tooLow" | "high" | "tooHigh";

export type Feedback = {
  correct: boolean;
  level: FeedbackLevel | null;
  correctDigitCount: number;
};

export const DISTANCE_THRESHOLDS: Record<Digits, number> = {
  2: 10,
  3: 50,
  4: 200,
};

export function generateHidden(digits: Digits, allowLeadingZero: boolean): string {
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

export function isValidGuess(guess: string, digits: Digits): boolean {
  if (guess.length !== digits) return false;
  return /^[0-9]+$/.test(guess);
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

export function evaluateGuess(guess: string, hidden: string, digits: Digits): Feedback {
  const g = parseInt(guess, 10);
  const h = parseInt(hidden, 10);
  const correct = guess === hidden;
  const correctDigitCount = countSharedDigits(guess, hidden);
  if (correct) {
    return { correct: true, level: null, correctDigitCount };
  }
  const diff = Math.abs(g - h);
  const threshold = DISTANCE_THRESHOLDS[digits];
  let level: FeedbackLevel;
  if (g < h) {
    level = diff <= threshold ? "low" : "tooLow";
  } else {
    level = diff <= threshold ? "high" : "tooHigh";
  }
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
