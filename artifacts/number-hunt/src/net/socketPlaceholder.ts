/**
 * Realtime multiplayer client.
 *
 * Connects to the API server's WebSocket endpoint at `/api/ws` and mirrors
 * the previous in-memory API so callers don't change much. Async functions
 * resolve once the server has acknowledged the request; fire-and-forget
 * mutations stream updated state back through `onUpdate` subscribers.
 *
 * The connection URL is derived from `EXPO_PUBLIC_DOMAIN`, which the dev
 * script exports from `$REPLIT_DEV_DOMAIN`. On Expo Go the app runs on the
 * user's phone, so we must use the public HTTPS dev domain (wss://...).
 */

export type Role = "host" | "guest";

export type FeedbackLevel = "low" | "tooLow" | "high" | "tooHigh";

export type Feedback = {
  correct: boolean;
  level: FeedbackLevel | null;
  correctDigitCount: number;
};

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

// ---- URL resolution ---------------------------------------------------------

function resolveWsUrl(): string {
  // Allow explicit override for advanced setups (e.g. custom backend host).
  const override = process.env["EXPO_PUBLIC_WS_URL"];
  if (override) return override;

  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  if (domain) return `wss://${domain}/api/ws`;

  // Last-resort fallback for `expo start --web` on localhost.
  if (typeof window !== "undefined" && typeof window.location !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/ws`;
  }

  return "ws://localhost/api/ws";
}

const WS_URL = resolveWsUrl();

// ---- Connection management --------------------------------------------------

type Pending = {
  resolve: (msg: ServerResponse) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type ServerResponse = {
  type: string;
  reqId?: string;
  state?: RoomState | null;
};

const pending = new Map<string, Pending>();
const listeners = new Map<string, Set<Listener>>();
const lastState = new Map<string, RoomState>();
const activeSubs = new Set<string>();

let socket: WebSocket | null = null;
let connecting: Promise<WebSocket> | null = null;
let reconnectAttempt = 0;

function newReqId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function connect(): Promise<WebSocket> {
  if (socket && socket.readyState === 1 /* OPEN */) return Promise.resolve(socket);
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
      // Re-subscribe to any rooms we were tracking before the reconnect.
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
        const ls = listeners.get(state.code);
        if (ls) ls.forEach((l) => l(state));
        return;
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
      // Fail any in-flight requests.
      for (const p of pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error("WebSocket closed"));
      }
      pending.clear();
      // Auto-reconnect with backoff if anyone still cares.
      if (activeSubs.size > 0 || listeners.size > 0) {
        reconnectAttempt = Math.min(reconnectAttempt + 1, 6);
        const delay = Math.min(500 * 2 ** (reconnectAttempt - 1), 8000);
        setTimeout(() => {
          connect().catch(() => {
            // swallow; next attempt scheduled by close handler again.
          });
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
        // ignore — reconnect will retry subscribed state via active subs.
      }
    })
    .catch(() => {
      // ignore — close handler will schedule a reconnect.
    });
}

// ---- Public API (mirrors the previous in-memory module) --------------------

export async function createRoom(
  digits: 2 | 3 | 4,
  hostName: string,
): Promise<RoomState> {
  const res = await request("create", { digits, hostName });
  if (!res.state) throw new Error("Failed to create room");
  activeSubs.add(res.state.code);
  lastState.set(res.state.code, res.state);
  return res.state;
}

export async function joinRoom(
  code: string,
  guestName: string,
): Promise<RoomState | null> {
  const res = await request("join", { code: code.toUpperCase(), guestName });
  if (res.state) {
    activeSubs.add(res.state.code);
    lastState.set(res.state.code, res.state);
  }
  return res.state ?? null;
}

export async function getRoom(code: string): Promise<RoomState | null> {
  const res = await request("getRoom", { code: code.toUpperCase() });
  return res.state ?? null;
}

export function getCachedRoom(code: string): RoomState | null {
  return lastState.get(code.toUpperCase()) ?? null;
}

export function setHidden(code: string, hidden: string): void {
  fire("setHidden", { code: code.toUpperCase(), hidden });
}

export function submitGuess(code: string, by: Role, guess: string): void {
  fire("guess", { code: code.toUpperCase(), by, guess });
}

export function switchRoles(code: string): void {
  fire("switchRoles", { code: code.toUpperCase() });
}

export function leaveRoom(code: string): void {
  const upper = code.toUpperCase();
  activeSubs.delete(upper);
  listeners.delete(upper);
  lastState.delete(upper);
  fire("leave", { code: upper });
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
  // Emit any cached state immediately.
  const cached = lastState.get(upper);
  if (cached) cb(cached);
  return () => {
    const s = listeners.get(upper);
    if (s) {
      s.delete(cb);
      if (s.size === 0) {
        listeners.delete(upper);
        // Last listener gone — stop tracking this room so the reconnect
        // loop and re-subscribe-on-open path don't keep it alive forever.
        activeSubs.delete(upper);
        lastState.delete(upper);
      }
    }
  };
}
