import AsyncStorage from "@react-native-async-storage/async-storage";

import { isNewBest } from "@/src/utils/scoring";
import type { Digits } from "@/src/utils/gameLogic";

const RECORDS_KEY = "number-hunt:records:v1";
const SETTINGS_KEY = "number-hunt:settings:v1";

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
};

export const DEFAULT_SETTINGS: Settings = {
  themeMode: "system",
  allowLeadingZero: false,
  soundOn: true,
  hapticsOn: true,
  language: "en",
  playerName: "Player 1",
};

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

export async function getSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
