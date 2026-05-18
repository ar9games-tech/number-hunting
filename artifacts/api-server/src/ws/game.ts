import type { IncomingMessage, Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

import { logger } from "../lib/logger";

type Digits = 2 | 3 | 4;
type Role = "host" | "guest";
type FeedbackLevel = "low" | "tooLow" | "high" | "tooHigh";

type Feedback = {
  correct: boolean;
  level: FeedbackLevel | null;
  correctDigitCount: number;
};

type GuessEntry = {
  by: Role;
  guess: string;
  feedback: Feedback;
  at: number;
};

type RoomState = {
  code: string;
  digits: Digits;
  hidden: string | null;
  history: GuessEntry[];
  status: "setup" | "guessing" | "won";
  winner: Role | null;
  hostName: string;
  guestName: string;
  guestJoined: boolean;
};

const DISTANCE_THRESHOLDS: Record<Digits, number> = { 2: 10, 3: 50, 4: 200 };

const ROOM_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours of inactivity → cleanup
const rooms = new Map<string, { state: RoomState; updatedAt: number }>();
const subscribers = new Map<string, Set<WebSocket>>();
const socketRooms = new WeakMap<WebSocket, Set<string>>();

// Per-socket identity: which room+role this socket actually owns. Set when
// the socket creates (host) or joins (guest) a room. Used to authorize
// privileged mutations (setHidden, guess, switchRoles, leave).
type Identity = { code: string; role: Role };
const socketIdentity = new WeakMap<WebSocket, Identity>();

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateRoomCode(): string {
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
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

function evaluateGuess(guess: string, hidden: string, digits: Digits): Feedback {
  const correct = guess === hidden;
  const correctDigitCount = countSharedDigits(guess, hidden);
  if (correct) return { correct: true, level: null, correctDigitCount };
  const g = parseInt(guess, 10);
  const h = parseInt(hidden, 10);
  const diff = Math.abs(g - h);
  const threshold = DISTANCE_THRESHOLDS[digits];
  const level: FeedbackLevel = g < h
    ? diff <= threshold ? "low" : "tooLow"
    : diff <= threshold ? "high" : "tooHigh";
  return { correct: false, level, correctDigitCount };
}

function getRoom(code: string): RoomState | null {
  const r = rooms.get(code);
  return r ? r.state : null;
}

function touch(code: string) {
  const r = rooms.get(code);
  if (r) r.updatedAt = Date.now();
}

function broadcast(code: string) {
  const state = getRoom(code);
  if (!state) return;
  touch(code);
  const subs = subscribers.get(code);
  if (!subs) return;
  const payload = JSON.stringify({ type: "state", state });
  for (const ws of subs) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

function subscribe(ws: WebSocket, code: string) {
  let set = subscribers.get(code);
  if (!set) {
    set = new Set();
    subscribers.set(code, set);
  }
  set.add(ws);
  let codes = socketRooms.get(ws);
  if (!codes) {
    codes = new Set();
    socketRooms.set(ws, codes);
  }
  codes.add(code);
  const state = getRoom(code);
  if (state) ws.send(JSON.stringify({ type: "state", state }));
}

function safeSend(ws: WebSocket, msg: unknown) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

type ClientMessage =
  | { type: "create"; reqId?: string; digits: Digits; hostName: string }
  | { type: "join"; reqId?: string; code: string; guestName: string }
  | { type: "getRoom"; reqId?: string; code: string }
  | { type: "subscribe"; code: string }
  | { type: "setHidden"; code: string; hidden: string }
  | { type: "guess"; code: string; by: Role; guess: string }
  | { type: "switchRoles"; code: string }
  | { type: "leave"; code: string }
  | { type: "ping"; reqId?: string };

function handleMessage(ws: WebSocket, raw: ClientMessage) {
  switch (raw.type) {
    case "create": {
      const digits = ([2, 3, 4] as const).includes(raw.digits)
        ? raw.digits
        : 3;
      let code = generateRoomCode();
      while (rooms.has(code)) code = generateRoomCode();
      const state: RoomState = {
        code,
        digits,
        hidden: null,
        history: [],
        status: "setup",
        winner: null,
        hostName: String(raw.hostName || "Player 1").slice(0, 24),
        guestName: "Player 2",
        guestJoined: false,
      };
      rooms.set(code, { state, updatedAt: Date.now() });
      subscribe(ws, code);
      socketIdentity.set(ws, { code, role: "host" });
      safeSend(ws, { type: "createResult", reqId: raw.reqId, state });
      logger.info({ code, digits }, "ws: room created");
      break;
    }
    case "join": {
      const code = String(raw.code || "").toUpperCase();
      const state = getRoom(code);
      if (!state) {
        safeSend(ws, { type: "joinResult", reqId: raw.reqId, state: null });
        return;
      }
      state.guestName = String(raw.guestName || "Player 2").slice(0, 24);
      state.guestJoined = true;
      subscribe(ws, code);
      socketIdentity.set(ws, { code, role: "guest" });
      safeSend(ws, { type: "joinResult", reqId: raw.reqId, state });
      broadcast(code);
      logger.info({ code }, "ws: guest joined");
      break;
    }
    case "getRoom": {
      const state = getRoom(String(raw.code || "").toUpperCase());
      safeSend(ws, { type: "getRoomResult", reqId: raw.reqId, state });
      break;
    }
    case "subscribe": {
      subscribe(ws, String(raw.code || "").toUpperCase());
      break;
    }
    case "setHidden": {
      const code = String(raw.code).toUpperCase();
      const id = socketIdentity.get(ws);
      if (!id || id.code !== code || id.role !== "host") return;
      const state = getRoom(code);
      if (!state) return;
      if (!/^[0-9]+$/.test(raw.hidden) || raw.hidden.length !== state.digits) return;
      state.hidden = raw.hidden;
      state.status = "guessing";
      state.history = [];
      state.winner = null;
      broadcast(code);
      break;
    }
    case "guess": {
      const code = String(raw.code).toUpperCase();
      const id = socketIdentity.get(ws);
      // Authorize: the socket must be bound to this room, and the `by` field
      // must match the socket's role. This prevents host-as-guest cheating.
      if (!id || id.code !== code) return;
      const by: Role = raw.by === "host" ? "host" : "guest";
      if (id.role !== by) return;
      const state = getRoom(code);
      if (!state || !state.hidden || state.status !== "guessing") return;
      if (!/^[0-9]+$/.test(raw.guess) || raw.guess.length !== state.digits) return;
      const fb = evaluateGuess(raw.guess, state.hidden, state.digits);
      state.history = [
        { by, guess: raw.guess, feedback: fb, at: Date.now() },
        ...state.history,
      ];
      if (fb.correct) {
        state.status = "won";
        state.winner = by;
      }
      broadcast(code);
      break;
    }
    case "switchRoles": {
      const code = String(raw.code).toUpperCase();
      const id = socketIdentity.get(ws);
      if (!id || id.code !== code || id.role !== "host") return;
      const state = getRoom(code);
      if (!state) return;
      const prev = state.hostName;
      state.hostName = state.guestName;
      state.guestName = prev;
      state.hidden = null;
      state.history = [];
      state.status = "setup";
      state.winner = null;
      broadcast(code);
      break;
    }
    case "leave": {
      const code = String(raw.code).toUpperCase();
      const id = socketIdentity.get(ws);
      // Only the host can close the room. Guests just unsubscribe.
      if (id && id.code === code && id.role === "host") {
        rooms.delete(code);
        subscribers.delete(code);
        logger.info({ code }, "ws: room closed by host");
      } else {
        subscribers.get(code)?.delete(ws);
        const set = subscribers.get(code);
        if (set && set.size === 0) subscribers.delete(code);
      }
      break;
    }
    case "ping": {
      safeSend(ws, { type: "pong", reqId: raw.reqId });
      break;
    }
  }
}

// Periodic cleanup of stale rooms.
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (now - r.updatedAt > ROOM_TTL_MS) {
      rooms.delete(code);
      subscribers.delete(code);
    }
  }
}, 1000 * 60 * 30).unref?.();

export function attachGameWs(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    try {
      const url = req.url ?? "";
      // Accept both `/api/ws` and `/api/ws?...`.
      if (!url.startsWith("/api/ws")) return;
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch (err) {
      logger.error({ err }, "ws: upgrade error");
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    logger.info("ws: client connected");

    // Heartbeat: ping every 30s, terminate if no pong.
    let alive = true;
    ws.on("pong", () => {
      alive = true;
    });
    const heartbeat = setInterval(() => {
      if (!alive) {
        ws.terminate();
        return;
      }
      alive = false;
      try {
        ws.ping();
      } catch {
        // ignore
      }
    }, 30000);

    ws.on("message", (data) => {
      let msg: ClientMessage | null = null;
      try {
        msg = JSON.parse(data.toString()) as ClientMessage;
      } catch {
        return;
      }
      if (msg && typeof msg.type === "string") {
        try {
          handleMessage(ws, msg);
        } catch (err) {
          logger.error({ err, type: msg.type }, "ws: handler error");
        }
      }
    });

    ws.on("close", () => {
      clearInterval(heartbeat);
      const codes = socketRooms.get(ws);
      if (codes) {
        for (const code of codes) {
          subscribers.get(code)?.delete(ws);
          const set = subscribers.get(code);
          if (set && set.size === 0) subscribers.delete(code);
        }
      }
    });

    ws.on("error", (err) => {
      logger.warn({ err }, "ws: socket error");
    });
  });

  logger.info("ws: game socket attached at /api/ws");
}
