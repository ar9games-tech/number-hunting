import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import {
  playLose as smPlayLose,
  playTap as smPlayTap,
  playWin as smPlayWin,
} from "@/src/services/soundManager";

// ---------------------------------------------------------------------------
// Thin compatibility wrappers around the central sound manager. New code
// should import directly from `@/src/services/soundManager`; these exports
// stay so existing call sites (FeedbackCard, NumericKeypad, result.tsx)
// keep working without an edit.
// ---------------------------------------------------------------------------

export function playTap(soundOn: boolean): void {
  smPlayTap(soundOn);
}

export function playWin(soundOn: boolean): void {
  smPlayWin(soundOn);
}

export function playLose(soundOn: boolean): void {
  smPlayLose(soundOn);
}

// ---------------------------------------------------------------------------
// Haptics — real on native, no-op on web. These belong with the audio
// helpers because the call sites always pair them ("celebration =
// playWin + successHaptic").
// ---------------------------------------------------------------------------

export function tapHaptic(hapticsOn: boolean): void {
  if (!hapticsOn || Platform.OS === "web") return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function successHaptic(hapticsOn: boolean): void {
  if (!hapticsOn || Platform.OS === "web") return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function errorHaptic(hapticsOn: boolean): void {
  if (!hapticsOn || Platform.OS === "web") return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
