/**
 * Realtime multiplayer client.
 *
 * Rooms hold 2–12 players. Every player races to guess a single hidden
 * number that the server picks. The server sends each socket a per-player
 * view containing only that player's own guesses and feedback — never the
 * opponents' history or the hidden number while the game is in progress.
 */

export type FeedbackLevel = "low" | "tooLow" | "high" | "tooHigh";

export type Feedback = {
  correct: boolean;
  level: FeedbackLevel | null;
  // null for 2-digit mode.
  correctDigitCount: number | null;
};

export type GuessEntry = {
  guess: string;
  feedback: Feedback;
  at: number;
};

export type Status = "waiting" | "playing" | "won";

export type PlayerSummary = {
  name: string;
  isHost: boolean;
};

export type OpponentSummary = {
  name: string;
  guessCount: number;
};

export type RoomState = {
  code: string;
  maxPlayers: number;
  /** Null until the host picks a digit length (i.e. starts the game). */
  digits: 2 | 3 | 4 | null;
  players: PlayerSummary[];
  isHost: boolean;
  yourName: string;
  yourHistory: GuessEntry[];
  opponents: OpponentSummary[];
  status: Status;
  /** Set only when status === "won". */
  winnerName: string | null;
  /** Set only when status === "won". */
  revealedHidden: string | null;
};

export type RoomMeta = {
  code: string;
  maxPlayers: number;
  playerCount: number;
  status: Status;
};

export type JoinError = "notFound" | "full" | "started";

/** Punishment card identifiers — mirror of the server's PUNISHMENT_CARDS. */
export type PunishmentCardId =
  | "directElimination"
  | "vote"
  | "sandal"
  | "animalSound";

export type PunishmentErrorReason =
  | "notInRoom"
  | "notEnoughPlayers"
  | "notPlaying"
  | "cooldown";

export type PunishmentReveal = {
  cardId: PunishmentCardId;
  drawnBy: string;
  cooldownUntil: number;
};

export const PUNISHMENT_MIN_PLAYERS = 4;

export type JoinOutcome =
  | { ok: true; state: RoomState }
  | { ok: false; error: JoinError };

type Listener = (state: RoomState) => void;
type CloseListener = () => void;

// ---- URL resolution --------------------------------------------------------

function resolveWsUrl(): string {
  const override = process.env["EXPO_PUBLIC_WS_URL"];
  if (override) return override;
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  if (domain) return `wss://${domain}/api/ws`;
  if (typeof window !== "undefined" && typeof window.location !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/ws`;
  }
  return "ws://localhost/api/ws";
}

const WS_URL = resolveWsUrl();

// ---- Connection management -------------------------------------------------

type Pending = {
  resolve: (msg: ServerResponse) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type ServerResponse = {
  type: string;
  reqId?: string;
  state?: RoomState | null;
  meta?: RoomMeta | null;
  code?: string;
  error?: JoinError;
  // Punishment events
  cardId?: PunishmentCardId;
  drawnBy?: string;
  cooldownUntil?: number;
  reason?: PunishmentErrorReason;
};

type PunishmentRevealListener = (reveal: PunishmentReveal) => void;
type PunishmentErrorListener = (reason: PunishmentErrorReason) => void;

const pending = new Map<string, Pending>();
const listeners = new Map<string, Set<Listener>>();
const closeListeners = new Map<string, Set<CloseListener>>();
const punishmentRevealListeners = new Map<string, Set<PunishmentRevealListener>>();
const punishmentErrorListeners = new Map<string, Set<PunishmentErrorListener>>();
const lastState = new Map<string, RoomState>();
const activeSubs = new Set<string>();

let socket: WebSocket | null = null;
let connecting: Promise<WebSocket> | null = null;
let reconnectAttempt = 0;

function newReqId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function connect(): Promise<WebSocket> {
  if (socket && socket.readyState === 1) return Promise.resolve(socket);
  if (connecting) return connecting;

  connecting = new Promise<WebSocket>((resolve, reject) => {
    let resolved = false;
    let sock: WebSocket;
    try {
      sock = new WebSocket(WS_URL);
    } catch (err) {
      connecting = null;
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    sock.onopen = () => {
      socket = sock;
      connecting = null;
      reconnectAttempt = 0;
      for (const code of activeSubs) {
        try {
          sock.send(JSON.stringify({ type: "subscribe", code }));
        } catch {
          // ignore
        }
      }
      resolved = true;
      resolve(sock);
    };

    sock.onmessage = (ev: MessageEvent) => {
      let msg: ServerResponse;
      try {
        const data = typeof ev.data === "string" ? ev.data : String(ev.data);
        msg = JSON.parse(data) as ServerResponse;
      } catch {
        return;
      }

      if (msg.type === "state" && msg.state) {
        const state = msg.state;
        lastState.set(state.code, state);
        listeners.get(state.code)?.forEach((l) => l(state));
        return;
      }

      if (msg.type === "roomClosed" && msg.code) {
        const code = msg.code;
        closeListeners.get(code)?.forEach((l) => l());
        return;
      }

      if (msg.type === "punishmentRevealed" && msg.code && msg.cardId) {
        const code = msg.code;
        const reveal: PunishmentReveal = {
          cardId: msg.cardId,
          drawnBy: msg.drawnBy ?? "",
          cooldownUntil: msg.cooldownUntil ?? 0,
        };
        punishmentRevealListeners.get(code)?.forEach((l) => l(reveal));
        // Fall through so any reqId on the requester also resolves below.
      }

      if (msg.type === "punishmentError" && msg.code && msg.reason) {
        const code = msg.code;
        const reason = msg.reason;
        punishmentErrorListeners.get(code)?.forEach((l) => l(reason));
      }

      if (msg.reqId) {
        const p = pending.get(msg.reqId);
        if (p) {
          clearTimeout(p.timer);
          pending.delete(msg.reqId);
          p.resolve(msg);
        }
      }
    };

    sock.onerror = () => {
      if (!resolved) {
        connecting = null;
        reject(new Error("WebSocket connection failed"));
      }
    };

    sock.onclose = () => {
      socket = null;
      connecting = null;
      for (const p of pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error("WebSocket closed"));
      }
      pending.clear();
      if (activeSubs.size > 0 || listeners.size > 0) {
        reconnectAttempt = Math.min(reconnectAttempt + 1, 6);
        const delay = Math.min(500 * 2 ** (reconnectAttempt - 1), 8000);
        setTimeout(() => {
          connect().catch(() => {});
        }, delay);
      }
    };
  });

  return connecting;
}

async function request(type: string, payload: Record<string, unknown>): Promise<ServerResponse> {
  const sock = await connect();
  const reqId = newReqId();
  return new Promise<ServerResponse>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending.delete(reqId)) reject(new Error(`Request "${type}" timed out`));
    }, 10000);
    pending.set(reqId, { resolve, reject, timer });
    try {
      sock.send(JSON.stringify({ type, reqId, ...payload }));
    } catch (err) {
      clearTimeout(timer);
      pending.delete(reqId);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

function fire(type: string, payload: Record<string, unknown>): void {
  void connect()
    .then((sock) => {
      try {
        sock.send(JSON.stringify({ type, ...payload }));
      } catch {
        // ignore
      }
    })
    .catch(() => {});
}

// ---- Public API ------------------------------------------------------------

export async function createRoom(
  maxPlayers: number,
  playerName: string,
): Promise<RoomState> {
  const res = await request("create", { maxPlayers, playerName });
  if (!res.state) throw new Error("Failed to create room");
  activeSubs.add(res.state.code);
  lastState.set(res.state.code, res.state);
  return res.state;
}

export async function joinRoom(
  code: string,
  playerName: string,
): Promise<JoinOutcome> {
  const res = await request("join", { code: code.toUpperCase(), playerName });
  if (res.state) {
    activeSubs.add(res.state.code);
    lastState.set(res.state.code, res.state);
    return { ok: true, state: res.state };
  }
  return { ok: false, error: res.error ?? "notFound" };
}

/** Lobby probe — returns only public metadata (no privileged data). */
export async function getRoomMeta(code: string): Promise<RoomMeta | null> {
  const res = await request("getRoom", { code: code.toUpperCase() });
  return res.meta ?? null;
}

export function getCachedRoom(code: string): RoomState | null {
  return lastState.get(code.toUpperCase()) ?? null;
}

/** Host-only — locks in a digit length and starts the game for everyone. */
export function setRoomDigits(code: string, digits: 2 | 3 | 4): void {
  fire("setDigits", { code: code.toUpperCase(), digits });
}

export function submitGuess(code: string, guess: string): void {
  fire("guess", { code: code.toUpperCase(), guess });
}

export function requestRematch(code: string): void {
  fire("rematch", { code: code.toUpperCase() });
}

export function leaveRoom(code: string): void {
  const upper = code.toUpperCase();
  activeSubs.delete(upper);
  listeners.delete(upper);
  closeListeners.delete(upper);
  punishmentRevealListeners.delete(upper);
  punishmentErrorListeners.delete(upper);
  lastState.delete(upper);
  fire("leave", { code: upper });
}

/** Fire-and-forget — server broadcasts `punishmentRevealed` to all peers. */
export function requestPunishmentCard(code: string): void {
  fire("requestPunishment", { code: code.toUpperCase() });
}

export function onPunishmentRevealed(
  code: string,
  cb: PunishmentRevealListener,
): () => void {
  const upper = code.toUpperCase();
  let set = punishmentRevealListeners.get(upper);
  if (!set) {
    set = new Set();
    punishmentRevealListeners.set(upper, set);
  }
  set.add(cb);
  return () => {
    const s = punishmentRevealListeners.get(upper);
    if (s) {
      s.delete(cb);
      if (s.size === 0) punishmentRevealListeners.delete(upper);
    }
  };
}

export function onPunishmentError(
  code: string,
  cb: PunishmentErrorListener,
): () => void {
  const upper = code.toUpperCase();
  let set = punishmentErrorListeners.get(upper);
  if (!set) {
    set = new Set();
    punishmentErrorListeners.set(upper, set);
  }
  set.add(cb);
  return () => {
    const s = punishmentErrorListeners.get(upper);
    if (s) {
      s.delete(cb);
      if (s.size === 0) punishmentErrorListeners.delete(upper);
    }
  };
}

export function onUpdate(code: string, cb: Listener): () => void {
  const upper = code.toUpperCase();
  let set = listeners.get(upper);
  if (!set) {
    set = new Set();
    listeners.set(upper, set);
  }
  set.add(cb);
  activeSubs.add(upper);
  fire("subscribe", { code: upper });
  const cached = lastState.get(upper);
  if (cached) cb(cached);
  return () => {
    const s = listeners.get(upper);
    if (s) {
      s.delete(cb);
      if (s.size === 0) listeners.delete(upper);
    }
    // NOTE: do NOT clear activeSubs / lastState here. The room screen
    // unmounts when navigating to /result, but we need the cached state to
    // survive so a rematch can re-attach to the same room. Both are cleared
    // only when `leaveRoom` is explicitly called.
  };
}

export function onRoomClosed(code: string, cb: CloseListener): () => void {
  const upper = code.toUpperCase();
  let set = closeListeners.get(upper);
  if (!set) {
    set = new Set();
    closeListeners.set(upper, set);
  }
  set.add(cb);
  return () => {
    const s = closeListeners.get(upper);
    if (s) {
      s.delete(cb);
      if (s.size === 0) closeListeners.delete(upper);
    }
  };
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
