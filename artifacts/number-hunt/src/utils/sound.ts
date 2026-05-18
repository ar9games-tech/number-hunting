import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Audio is reserved for a future release. These no-op stubs are the single
// integration point the rest of the app calls into so that when real audio
// arrives we only have to edit this file (load assets, play, respect mute).
// ---------------------------------------------------------------------------

/** Tap / button-press sound stub. Called from interactive elements. */
export function playTap(_soundOn: boolean): void {
  // intentionally empty — placeholder for future expo-audio integration.
}

/** Win / fanfare sound stub. Called from the result screen on victory. */
export function playWin(_soundOn: boolean): void {
  // intentionally empty.
}

/** Loss / defeat sound stub. */
export function playLose(_soundOn: boolean): void {
  // intentionally empty.
}

// ---------------------------------------------------------------------------
// Haptic helpers. These are real, just centralized so individual components
// don't each re-check the platform + setting. Web is a no-op since RN haptics
// only exist on native.
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
