/**
 * Sound manager — centralized audio playback for Number Hunt.
 *
 * Every UI/gameplay event the app cares about has a dedicated `play…`
 * function below. Components call these directly (they accept `soundOn`
 * so they can be invoked unconditionally) and never touch the audio
 * backend themselves.
 *
 * --------------------------------------------------------------------
 * WIRING REAL AUDIO (Expo AV)
 * --------------------------------------------------------------------
 * 1. Add the dependency to artifacts/number-hunt/package.json:
 *
 *      pnpm --filter @workspace/number-hunt add expo-av
 *
 * 2. Drop sound files (mp3 / m4a / wav) into:
 *
 *      artifacts/number-hunt/assets/sounds/
 *
 *    Suggested file names matching the SOUND_FILES map below:
 *      tap.mp3, key.mp3, wrong.mp3, correct.mp3, win.mp3, lose.mp3,
 *      room_created.mp3, player_joined.mp3, game_start.mp3,
 *      new_record.mp3
 *
 * 3. Uncomment the `loadSound` body and `Audio` import block at the
 *    bottom of this file. Everything else (play* APIs, soundOn gating,
 *    error swallowing) stays the same.
 *
 * Until step 3 runs, every play* call is a safe no-op that never throws
 * even if a sound file is missing — by design.
 * --------------------------------------------------------------------
 */

import { Platform } from "react-native";

/** All sound event IDs the app knows about. */
export type SoundId =
  | "tap"
  | "key"
  | "wrong"
  | "correct"
  | "win"
  | "lose"
  | "roomCreated"
  | "playerJoined"
  | "gameStart"
  | "newRecord"
  | "punishmentReveal";

/**
 * Map from event id to the asset path. Swap these `require(...)` calls
 * in once the real files exist (see the WIRING REAL AUDIO block above).
 * Until then the map intentionally holds `null` so nothing fails at
 * bundle time on a fresh checkout.
 */
const SOUND_FILES: { [K in SoundId]: number | null } = {
  tap: null, // require("../../assets/sounds/tap.mp3"),
  key: null, // require("../../assets/sounds/key.mp3"),
  wrong: null, // require("../../assets/sounds/wrong.mp3"),
  correct: null, // require("../../assets/sounds/correct.mp3"),
  win: null, // require("../../assets/sounds/win.mp3"),
  lose: null, // require("../../assets/sounds/lose.mp3"),
  roomCreated: null, // require("../../assets/sounds/room_created.mp3"),
  playerJoined: null, // require("../../assets/sounds/player_joined.mp3"),
  gameStart: null, // require("../../assets/sounds/game_start.mp3"),
  newRecord: null, // require("../../assets/sounds/new_record.mp3"),
  punishmentReveal: null, // require("../../assets/sounds/punishment_reveal.mp3"),
};

/**
 * Loaded Sound instances are cached so each effect only decodes once.
 * Type kept loose (`unknown`) so this file doesn't depend on expo-av's
 * types being present at compile time.
 */
const cache: Partial<{ [K in SoundId]: unknown }> = {};

/**
 * Load (and cache) the Sound instance for an id. Returns null if the
 * asset is missing, expo-av is unavailable, or anything throws — every
 * caller is expected to tolerate a null backend silently.
 */
async function loadSound(_id: SoundId): Promise<unknown | null> {
  // ---- Real implementation (uncomment after installing expo-av) ----
  //
  // try {
  //   const asset = SOUND_FILES[_id];
  //   if (!asset) return null;
  //   if (cache[_id]) return cache[_id];
  //   // Lazy require so the bundler doesn't fail when expo-av is missing.
  //   const { Audio } = require("expo-av") as typeof import("expo-av");
  //   const { sound } = await Audio.Sound.createAsync(asset, {
  //     shouldPlay: false,
  //     volume: 0.8,
  //   });
  //   cache[_id] = sound;
  //   return sound;
  // } catch {
  //   return null;
  // }
  //
  // -----------------------------------------------------------------
  return null;
}

/**
 * Fire-and-forget play. Swallows every error — missing asset, decoder
 * crash, backend unavailable on the current platform — because UI sound
 * effects must never bring the app down.
 */
function play(id: SoundId, soundOn: boolean): void {
  if (!soundOn) return;
  // Web inside an iframe (Replit preview) often blocks audio before a
  // user gesture; we still attempt playback but swallow errors quietly.
  void (async () => {
    try {
      const s = await loadSound(id);
      if (!s) return;
      // Real backend (expo-av) would call:
      //   await (s as import("expo-av").Audio.Sound).replayAsync();
      const anyS = s as { replayAsync?: () => Promise<unknown> };
      if (typeof anyS.replayAsync === "function") {
        await anyS.replayAsync();
      }
    } catch {
      // Intentional: never crash the UI because a sound failed.
    }
  })();
}

/** Free every cached sound. Call from app teardown if you ever need it. */
export async function unloadAllSounds(): Promise<void> {
  for (const key of Object.keys(cache) as SoundId[]) {
    try {
      const s = cache[key] as { unloadAsync?: () => Promise<unknown> } | undefined;
      if (s?.unloadAsync) await s.unloadAsync();
    } catch {
      // ignore
    }
    delete cache[key];
  }
}

// ---------------------------------------------------------------------------
// Public API — one function per UI event, all guarded by `soundOn`.
// ---------------------------------------------------------------------------

export function playTap(soundOn: boolean): void {
  play("tap", soundOn);
}
export function playKey(soundOn: boolean): void {
  play("key", soundOn);
}
export function playWrong(soundOn: boolean): void {
  play("wrong", soundOn);
}
export function playCorrect(soundOn: boolean): void {
  play("correct", soundOn);
}
export function playWin(soundOn: boolean): void {
  play("win", soundOn);
}
export function playLose(soundOn: boolean): void {
  play("lose", soundOn);
}
export function playRoomCreated(soundOn: boolean): void {
  play("roomCreated", soundOn);
}
export function playPlayerJoined(soundOn: boolean): void {
  play("playerJoined", soundOn);
}
export function playGameStart(soundOn: boolean): void {
  play("gameStart", soundOn);
}
export function playNewRecord(soundOn: boolean): void {
  play("newRecord", soundOn);
}
export function playPunishmentReveal(soundOn: boolean): void {
  play("punishmentReveal", soundOn);
}

/** Re-exported for callers that want the raw asset map (debug screens, etc). */
export { SOUND_FILES };

// Reference Platform so the unused-import warning stays quiet even before
// expo-av is wired in (some platforms may want platform-gated audio config).
void Platform;
