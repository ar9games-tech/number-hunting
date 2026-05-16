/**
 * Local in-memory simulation of an online multiplayer room.
 *
 * TODO: replace with a real socket.io connection. Suggested approach:
 *   1. Stand up a small socket.io server (e.g. on the API server artifact).
 *   2. Replace the in-memory `rooms` map below with socket emits/listens.
 *   3. Keep the same public API (createRoom, joinRoom, setHidden, submitGuess,
 *      onUpdate, leave) so callers do not need to change.
 */

import { evaluateGuess, generateRoomCode, type Feedback } from "@/src/utils/gameLogic";

export type Role = "host" | "guest";

export type GuessEntry = {
  by: Role;
  guess: string;
  feedback: Feedback;
  at: number;
};

export type RoomState = {
  code: string;
  digits: 2 | 3 | 4;
  hidden: string | null;
  history: GuessEntry[];
  status: "setup" | "guessing" | "won";
  winner: Role | null;
  hostName: string;
  guestName: string;
  guestJoined: boolean;
};

type Listener = (state: RoomState) => void;

const rooms = new Map<string, RoomState>();
const listeners = new Map<string, Set<Listener>>();

function emit(code: string) {
  const state = rooms.get(code);
  if (!state) return;
  const ls = listeners.get(code);
  if (!ls) return;
  // Clone to avoid downstream mutation
  const snapshot: RoomState = { ...state, history: [...state.history] };
  ls.forEach((l) => l(snapshot));
}

export function createRoom(digits: 2 | 3 | 4, hostName: string): RoomState {
  let code = generateRoomCode();
  while (rooms.has(code)) code = generateRoomCode();
  const state: RoomState = {
    code,
    digits,
    hidden: null,
    history: [],
    status: "setup",
    winner: null,
    hostName,
    guestName: "Player 2",
    guestJoined: false,
  };
  rooms.set(code, state);
  return state;
}

export function joinRoom(code: string, guestName: string): RoomState | null {
  const state = rooms.get(code);
  if (!state) return null;
  state.guestName = guestName;
  state.guestJoined = true;
  emit(code);
  return state;
}

export function getRoom(code: string): RoomState | null {
  return rooms.get(code) ?? null;
}

export function setHidden(code: string, hidden: string): RoomState | null {
  const state = rooms.get(code);
  if (!state) return null;
  state.hidden = hidden;
  state.status = "guessing";
  state.history = [];
  state.winner = null;
  emit(code);
  return state;
}

export function submitGuess(code: string, by: Role, guess: string): RoomState | null {
  const state = rooms.get(code);
  if (!state || !state.hidden || state.status !== "guessing") return null;
  const feedback = evaluateGuess(guess, state.hidden, state.digits);
  state.history = [{ by, guess, feedback, at: Date.now() }, ...state.history];
  if (feedback.correct) {
    state.status = "won";
    state.winner = by;
  }
  emit(code);
  return state;
}

export function switchRoles(code: string): RoomState | null {
  const state = rooms.get(code);
  if (!state) return null;
  const prevHost = state.hostName;
  state.hostName = state.guestName;
  state.guestName = prevHost;
  state.hidden = null;
  state.history = [];
  state.status = "setup";
  state.winner = null;
  emit(code);
  return state;
}

export function leaveRoom(code: string) {
  rooms.delete(code);
  listeners.delete(code);
}

export function onUpdate(code: string, cb: Listener): () => void {
  let set = listeners.get(code);
  if (!set) {
    set = new Set();
    listeners.set(code, set);
  }
  set.add(cb);
  // Emit current state immediately
  const state = rooms.get(code);
  if (state) cb({ ...state, history: [...state.history] });
  return () => {
    const s = listeners.get(code);
    if (s) s.delete(cb);
  };
}
