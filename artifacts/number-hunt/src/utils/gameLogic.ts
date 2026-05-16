export type Digits = 2 | 3 | 4;

export type Feedback = {
  tooHigh: boolean;
  tooLow: boolean;
  correct: boolean;
  correctDigitCount: number;
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

export function evaluateGuess(guess: string, hidden: string): Feedback {
  const g = parseInt(guess, 10);
  const h = parseInt(hidden, 10);
  const correct = guess === hidden;
  return {
    tooHigh: !correct && g > h,
    tooLow: !correct && g < h,
    correct,
    correctDigitCount: countSharedDigits(guess, hidden),
  };
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
