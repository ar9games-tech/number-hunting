/**
 * Sound manager — centralized audio playback for Number Hunt.
 *
 * Every UI/gameplay event has a dedicated `play…` function below.
 * Components call them directly (each takes `soundOn` so call sites can
 * fire unconditionally) and never touch the audio backend themselves.
 *
 * --------------------------------------------------------------------
 * DROPPING IN REAL AUDIO ASSETS
 * --------------------------------------------------------------------
 * Drop sound files (mp3 / m4a / wav) into:
 *
 *     artifacts/number-hunt/assets/sounds/
 *
 * Then add a `require(...)` for each one to the SOUND_FILES map below.
 * The expected file names are listed next to each entry. Every entry
 * left at `null` is a safe no-op — missing files never crash anything.
 *
 * See `artifacts/number-hunt/assets/sounds/README.md` for the full list
 * of expected files, recommended formats, and design intent for each
 * sound (general game + punishment pack sequence).
 * --------------------------------------------------------------------
 */

import { createAudioPlayer, type AudioPlayer, type AudioSource } from "expo-audio";

/** All sound event IDs the app knows about. */
export type SoundId =
  // General game sounds
  | "tap"
  | "key"
  | "wrong"
  | "correct"
  | "win"
  | "lose"
  | "newRecord"
  | "roomCreated"
  | "playerJoined"
  | "matchFound"
  | "randomSearching"
  | "gameStart"
  | "rematch"
  // Punishment pack sequence
  | "packActivate"
  | "packShake"
  | "packGlow"
  | "punishmentReveal"
  | "punishmentPackOpen"
  | "punishmentAccept"
  | "punishmentRefuse"
  // Punishment outcome sounds (one per card)
  | "punishmentDirectElim"
  | "punishmentVote"
  | "punishmentAnotherChance"
  | "punishmentChooseAnother"
  // Misc
  | "newMatch";

/**
 * Per-sound volume. Tuned so loud one-shots (win, reveal) don't drown
 * out the constant chatter of taps and keypad presses.
 */
const SOUND_VOLUME: { [K in SoundId]: number } = {
  tap: 0.35,
  key: 0.4,
  wrong: 0.6,
  correct: 0.7,
  win: 0.85,
  lose: 0.7,
  newRecord: 0.85,
  roomCreated: 0.6,
  playerJoined: 0.6,
  matchFound: 0.75,
  randomSearching: 0.45,
  gameStart: 0.75,
  rematch: 0.65,
  packActivate: 0.55,
  packShake: 0.55,
  packGlow: 0.6,
  punishmentReveal: 0.8,
  punishmentPackOpen: 0.65,
  punishmentAccept: 0.7,
  punishmentRefuse: 0.7,
  punishmentDirectElim: 0.85,
  punishmentVote: 0.7,
  punishmentAnotherChance: 0.75,
  punishmentChooseAnother: 0.7,
  newMatch: 0.7,
};

/**
 * Map from event id to its bundled asset (via `require(...)`). Leave an
 * entry as `null` if the file isn't shipped yet — `play()` will simply
 * no-op for that event instead of throwing.
 *
 * To wire a real file: drop it into `assets/sounds/<name>.mp3` and
 * replace the corresponding `null` with `require("../../assets/sounds/<name>.mp3")`.
 */
const SOUND_FILES: { [K in SoundId]: AudioSource | null } = {
  tap: null, // assets/sounds/tap.mp3
  key: null, // assets/sounds/key.mp3
  wrong: null, // assets/sounds/wrong.mp3
  correct: null, // assets/sounds/correct.mp3
  win: null, // assets/sounds/win.mp3
  lose: null, // assets/sounds/lose.mp3
  newRecord: null, // assets/sounds/new_record.mp3
  roomCreated: null, // assets/sounds/room_created.mp3
  playerJoined: null, // assets/sounds/player_joined.mp3
  matchFound: null, // assets/sounds/match_found.mp3
  randomSearching: null, // assets/sounds/random_searching.mp3 (loopable)
  gameStart: null, // assets/sounds/game_start.mp3 (countdown / kickoff)
  rematch: null, // assets/sounds/rematch.mp3
  packActivate: null, // assets/sounds/pack_activate.mp3
  packShake: null, // assets/sounds/pack_shake.mp3
  packGlow: null, // assets/sounds/pack_glow.mp3
  punishmentReveal: null, // assets/sounds/punishment_reveal.mp3
  punishmentPackOpen: null, // assets/sounds/punishment_pack_open.mp3
  punishmentAccept: null, // assets/sounds/punishment_accept.mp3
  punishmentRefuse: null, // assets/sounds/punishment_refuse.mp3
  punishmentDirectElim: null, // assets/sounds/punishment_direct_elim.mp3
  punishmentVote: null, // assets/sounds/punishment_vote.mp3
  punishmentAnotherChance: null, // assets/sounds/punishment_another_chance.mp3
  punishmentChooseAnother: null, // assets/sounds/punishment_choose_another.mp3
  newMatch: null, // assets/sounds/new_match.mp3
};

/**
 * Cached AudioPlayer instances, keyed by SoundId. Each asset is loaded
 * exactly once and then replayed via seek+play; this keeps latency low
 * and avoids per-tap allocation thrash.
 */
const cache: Partial<{ [K in SoundId]: AudioPlayer }> = {};

/**
 * Stage sounds that participate in the punishment-pack opening sequence.
 * `stopPackSounds()` halts all of them so a later stage's sound can play
 * cleanly without overlapping audio from an earlier stage.
 */
const PACK_SEQUENCE_IDS: SoundId[] = [
  "packActivate",
  "packShake",
  "packGlow",
  "punishmentReveal",
  "punishmentPackOpen",
];

/**
 * Load (or fetch from cache) the player for a sound id. Returns `null`
 * if the asset isn't shipped yet or the audio backend fails — every
 * caller tolerates `null` silently.
 */
function getPlayer(id: SoundId): AudioPlayer | null {
  try {
    const cached = cache[id];
    if (cached) return cached;
    const asset = SOUND_FILES[id];
    if (!asset) return null;
    const player = createAudioPlayer(asset);
    // expo-audio: volume is a settable 0..1 number on the player.
    player.volume = SOUND_VOLUME[id];
    cache[id] = player;
    return player;
  } catch {
    // Backend missing or asset bundle issue — fall through to no-op.
    return null;
  }
}

/**
 * Fire-and-forget play. Swallows every error — missing asset, decoder
 * crash, backend unavailable on the current platform — because UI sound
 * effects must never bring the app down. On web inside the Replit
 * preview iframe, audio often requires a user gesture; failures are
 * silently absorbed there too.
 */
/**
 * Rewind helper — `seekTo` is async in expo-audio, so we must swallow
 * rejections via `.catch()` (not just try/catch) or seek-before-load
 * failures would surface as unhandled promise rejections.
 */
function safeSeekToStart(player: AudioPlayer): void {
  try {
    void Promise.resolve(player.seekTo(0)).catch(() => {
      /* ignore — common before first play on some platforms */
    });
  } catch {
    // ignore — synchronous throw from a broken backend.
  }
}

function play(id: SoundId, soundOn: boolean): void {
  if (!soundOn) return;
  try {
    const player = getPlayer(id);
    if (!player) return;
    // Rewind so rapid re-triggers (key spam) restart from frame 0
    // instead of overlapping/echoing.
    safeSeekToStart(player);
    player.play();
  } catch {
    // Intentional: never crash the UI because a sound failed.
  }
}

/**
 * Hard-stop every pack-sequence sound. Use this between stages of the
 * pack-opening animation (shake → glow → reveal) so a slower previous
 * sound doesn't bleed over the next dramatic cue.
 */
export function stopPackSounds(): void {
  for (const id of PACK_SEQUENCE_IDS) {
    const p = cache[id];
    if (!p) continue;
    try {
      p.pause();
      safeSeekToStart(p);
    } catch {
      // ignore
    }
  }
}

/** Free every cached player. Call from app teardown if needed. */
export function unloadAllSounds(): void {
  for (const key of Object.keys(cache) as SoundId[]) {
    try {
      // expo-audio's documented teardown method.
      cache[key]?.remove();
    } catch {
      // ignore
    }
    delete cache[key];
  }
}

// ---------------------------------------------------------------------------
// Public API — one function per UI event, all guarded by `soundOn`.
// ---------------------------------------------------------------------------

// General game sounds
export function playTap(soundOn: boolean): void { play("tap", soundOn); }
export function playKey(soundOn: boolean): void { play("key", soundOn); }
export function playWrong(soundOn: boolean): void { play("wrong", soundOn); }
export function playCorrect(soundOn: boolean): void { play("correct", soundOn); }
export function playWin(soundOn: boolean): void { play("win", soundOn); }
export function playLose(soundOn: boolean): void { play("lose", soundOn); }
export function playNewRecord(soundOn: boolean): void { play("newRecord", soundOn); }
export function playRoomCreated(soundOn: boolean): void { play("roomCreated", soundOn); }
export function playPlayerJoined(soundOn: boolean): void { play("playerJoined", soundOn); }
export function playMatchFound(soundOn: boolean): void { play("matchFound", soundOn); }
export function playGameStart(soundOn: boolean): void { play("gameStart", soundOn); }
export function playRematch(soundOn: boolean): void { play("rematch", soundOn); }

/**
 * Start the "searching for an opponent" loop. Idempotent — calling twice
 * just rewinds the existing player. Call `stopRandomSearching()` when
 * the modal closes (match found or user cancel).
 */
export function playRandomSearching(soundOn: boolean): void {
  if (!soundOn) return;
  try {
    const player = getPlayer("randomSearching");
    if (!player) return;
    // Loop the search ambience until explicitly stopped.
    player.loop = true;
    safeSeekToStart(player);
    player.play();
  } catch {
    // ignore
  }
}

export function stopRandomSearching(): void {
  const p = cache["randomSearching"];
  if (!p) return;
  try {
    p.pause();
    safeSeekToStart(p);
  } catch {
    // ignore
  }
}

// Punishment pack sequence — each stage stops the previous stage's
// sound first so the audio matches the animation cleanly.
export function playPackActivate(soundOn: boolean): void {
  stopPackSounds();
  play("packActivate", soundOn);
}
export function playPackShake(soundOn: boolean): void {
  stopPackSounds();
  play("packShake", soundOn);
}
export function playPackGlow(soundOn: boolean): void {
  stopPackSounds();
  play("packGlow", soundOn);
}
export function playPunishmentReveal(soundOn: boolean): void {
  stopPackSounds();
  play("punishmentReveal", soundOn);
}
export function playPunishmentPackOpen(soundOn: boolean): void {
  // Legacy / compound opener used by result.tsx — fired back-to-back
  // with `playPunishmentReveal`. Deliberately does NOT call
  // `stopPackSounds()` so the follow-up reveal cue can layer on top
  // instead of getting cancelled by its own pair partner.
  play("punishmentPackOpen", soundOn);
}
export function playPunishmentAccept(soundOn: boolean): void {
  play("punishmentAccept", soundOn);
}
export function playPunishmentRefuse(soundOn: boolean): void {
  play("punishmentRefuse", soundOn);
}

// Card outcome — pick by punishment cardId so the result screen can
// route a single call through `playPunishmentOutcome(cardId, soundOn)`.
export type PunishmentCardId =
  | "directElimination"
  | "vote"
  | "anotherChance"
  | "chooseAnother";

export function playPunishmentOutcome(card: PunishmentCardId, soundOn: boolean): void {
  switch (card) {
    case "directElimination":
      play("punishmentDirectElim", soundOn);
      return;
    case "vote":
      play("punishmentVote", soundOn);
      return;
    case "anotherChance":
      play("punishmentAnotherChance", soundOn);
      return;
    case "chooseAnother":
      play("punishmentChooseAnother", soundOn);
      return;
  }
}

export function playNewMatch(soundOn: boolean): void { play("newMatch", soundOn); }

/** Re-exported for debug screens that want to enumerate the asset map. */
export { SOUND_FILES };
