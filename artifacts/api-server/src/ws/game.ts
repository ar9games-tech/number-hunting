import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

import { logger } from "../lib/logger";

type Digits = 2 | 3 | 4;
type FeedbackLevel = "low" | "tooLow" | "high" | "tooHigh";

type Feedback = {
  correct: boolean;
  level: FeedbackLevel | null;
  // null for 2-digit mode (spec: only show count for 3- and 4-digit).
  correctDigitCount: number | null;
};

type GuessEntry = {
  guess: string;
  feedback: Feedback;
  at: number;
};

type Status = "waiting" | "playing" | "won";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 12;

type Player = {
  /**
   * Server-side opaque socket id. Used to key per-player history and to
   * identify the host. Never sent to clients — they only see display names.
   */
  socketId: string;
  /** Display string — typically `"Nickname #Serial"`. */
  name: string;
  joinedAt: number;
};

type RoomInternal = {
  code: string;
  maxPlayers: number;
  /** Host is always `players[0]`. Promotion on host leave reshuffles. */
  players: Player[];
  /** Set only after the host picks a digit length and the game begins. */
  digits: Digits | null;
  /** Hidden number — generated when the game starts, revealed on win. */
  hidden: string | null;
  status: Status;
  /** Socket id of the winning player; null until status === "won". */
  winnerId: string | null;
  /** Per-player guess history keyed by socketId. */
  histories: Map<string, GuessEntry[]>;
  /**
   * Punishment-card mutex: timestamp (ms) until which no new card may be
   * drawn. Acts as a brief "already opening" guard against concurrent
   * requests; the real once-per-match gate is `punishmentUsed`.
   */
  punishmentLockUntil: number;
  /**
   * True once the winner has drawn their punishment card for this round.
   * Reset on `rematch`. The button only fires once per match.
   */
  punishmentUsed: boolean;
};

/** Punishment cards. IDs match what the client renders in its modal. */
type PunishmentCardId = "directElimination" | "vote" | "sandal" | "animalSound";
const PUNISHMENT_CARDS: PunishmentCardId[] = [
  "directElimination",
  "vote",
  "sandal",
  "animalSound",
];
/** Brief mutex so two concurrent winner taps still produce one reveal. */
const PUNISHMENT_LOCK_MS = 2_000;

type OpponentSummary = {
  name: string;
  guessCount: number;
};

type PlayerSummary = {
  name: string;
  isHost: boolean;
};

// Per-socket payload — never leaks other players' guess content or the
// hidden number until the game is won.
type PlayerView = {
  code: string;
  maxPlayers: number;
  digits: Digits | null;
  players: PlayerSummary[];
  isHost: boolean;
  yourName: string;
  yourHistory: GuessEntry[];
  opponents: OpponentSummary[];
  status: Status;
  /** Display name of the winner, or null. Only set when status === "won". */
  winnerName: string | null;
  /** Only populated when status === "won". */
  revealedHidden: string | null;
};

const DISTANCE_THRESHOLDS: Record<Digits, number> = { 2: 10, 3: 50, 4: 200 };

const ROOM_TTL_MS = 1000 * 60 * 60 * 4;
const rooms = new Map<string, { room: RoomInternal; updatedAt: number }>();
const subscribers = new Map<string, Set<WebSocket>>();
const socketRooms = new WeakMap<WebSocket, Set<string>>();

type Identity = { code: string; socketId: string };
const socketIdentity = new WeakMap<WebSocket, Identity>();
const socketIds = new WeakMap<WebSocket, string>();

function idFor(ws: WebSocket): string {
  let id = socketIds.get(ws);
  if (!id) {
    id = randomUUID();
    socketIds.set(ws, id);
  }
  return id;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateRoomCode(): string {
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function generateHidden(digits: Digits): string {
  // Allow leading zeros so e.g. "027" is a valid 3-digit secret. The lobby
  // always treats hidden as a string the same length as `digits`.
  let out = "";
  for (let i = 0; i < digits; i++) out += Math.floor(Math.random() * 10).toString();
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
  const showCount = digits >= 3;
  const correctDigitCount = showCount ? countSharedDigits(guess, hidden) : null;
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

function getRoom(code: string): RoomInternal | null {
  const r = rooms.get(code);
  return r ? r.room : null;
}

function touch(code: string) {
  const r = rooms.get(code);
  if (r) r.updatedAt = Date.now();
}

function clampMaxPlayers(n: unknown): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return MIN_PLAYERS;
  return Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, v));
}

function isHost(room: RoomInternal, socketId: string): boolean {
  return room.players[0]?.socketId === socketId;
}

function playerById(room: RoomInternal, socketId: string): Player | undefined {
  return room.players.find((p) => p.socketId === socketId);
}

function buildView(room: RoomInternal, socketId: string): PlayerView {
  const me = playerById(room, socketId);
  const yourHistory = room.histories.get(socketId) ?? [];
  const opponents: OpponentSummary[] = room.players
    .filter((p) => p.socketId !== socketId)
    .map((p) => ({
      name: p.name,
      guessCount: (room.histories.get(p.socketId) ?? []).length,
    }));
  const winner =
    room.winnerId ? room.players.find((p) => p.socketId === room.winnerId) : null;

  return {
    code: room.code,
    maxPlayers: room.maxPlayers,
    digits: room.digits,
    players: room.players.map((p, i) => ({ name: p.name, isHost: i === 0 })),
    isHost: isHost(room, socketId),
    yourName: me?.name ?? "",
    yourHistory,
    opponents,
    status: room.status,
    winnerName: winner?.name ?? null,
    revealedHidden: room.status === "won" ? room.hidden : null,
  };
}

function sendState(ws: WebSocket, room: RoomInternal) {
  const id = socketIdentity.get(ws);
  if (!id || id.code !== room.code) return; // Don't send privileged state to non-players.
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ type: "state", state: buildView(room, id.socketId) }));
}

function broadcast(code: string) {
  const room = getRoom(code);
  if (!room) return;
  touch(code);
  const subs = subscribers.get(code);
  if (!subs) return;
  for (const ws of subs) sendState(ws, room);
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
  const room = getRoom(code);
  if (room) sendState(ws, room);
}

function safeSend(ws: WebSocket, msg: unknown) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function sanitizeName(raw: unknown, fallback: string): string {
  const s = String(raw ?? "").slice(0, 64).trim();
  return s || fallback;
}

function closeRoom(code: string, reason: string) {
  if (!rooms.has(code)) return;
  rooms.delete(code);
  const subs = subscribers.get(code);
  if (subs) {
    for (const peer of subs) {
      safeSend(peer, { type: "roomClosed", code });
    }
    subscribers.delete(code);
  }
  logger.info({ code, reason }, "ws: room closed");
}

type ClientMessage =
  | { type: "create"; reqId?: string; maxPlayers: number; playerName: string }
  | { type: "join"; reqId?: string; code: string; playerName: string }
  | { type: "getRoom"; reqId?: string; code: string }
  | { type: "subscribe"; code: string }
  | { type: "setDigits"; code: string; digits: Digits }
  | { type: "guess"; code: string; guess: string }
  | { type: "rematch"; code: string }
  | { type: "leave"; code: string }
  | { type: "requestPunishment"; reqId?: string; code: string }
  | { type: "ping"; reqId?: string };

type PunishmentErrorReason =
  | "notInRoom"
  | "notWinner"
  | "notWon"
  | "alreadyUsed";

// Public room metadata returned by getRoom (no privileged data).
type PublicRoomMeta = {
  code: string;
  maxPlayers: number;
  playerCount: number;
  status: Status;
};

function publicMeta(room: RoomInternal): PublicRoomMeta {
  return {
    code: room.code,
    maxPlayers: room.maxPlayers,
    playerCount: room.players.length,
    status: room.status,
  };
}

type JoinError = "notFound" | "full" | "started";

function handleMessage(ws: WebSocket, raw: ClientMessage) {
  switch (raw.type) {
    case "create": {
      const maxPlayers = clampMaxPlayers(raw.maxPlayers);
      const hostId = idFor(ws);
      let code = generateRoomCode();
      while (rooms.has(code)) code = generateRoomCode();
      const room: RoomInternal = {
        code,
        maxPlayers,
        players: [
          {
            socketId: hostId,
            name: sanitizeName(raw.playerName, "Host"),
            joinedAt: Date.now(),
          },
        ],
        digits: null,
        hidden: null,
        status: "waiting",
        winnerId: null,
        punishmentUsed: false,
        histories: new Map(),
        punishmentLockUntil: 0,
        // (punishmentUsed initialized above)
      };
      rooms.set(code, { room, updatedAt: Date.now() });
      socketIdentity.set(ws, { code, socketId: hostId });
      subscribe(ws, code);
      safeSend(ws, {
        type: "createResult",
        reqId: raw.reqId,
        state: buildView(room, hostId),
      });
      logger.info({ code, maxPlayers }, "ws: room created");
      break;
    }

    case "join": {
      const code = String(raw.code || "").toUpperCase();
      const room = getRoom(code);
      if (!room) {
        safeSend(ws, {
          type: "joinResult",
          reqId: raw.reqId,
          state: null,
          error: "notFound" satisfies JoinError,
        });
        return;
      }
      // Can't join a game in progress or already-decided one.
      if (room.status !== "waiting") {
        safeSend(ws, {
          type: "joinResult",
          reqId: raw.reqId,
          state: null,
          error: "started" satisfies JoinError,
        });
        logger.warn({ code }, "ws: join rejected — already started");
        return;
      }
      const playerId = idFor(ws);
      const existing = playerById(room, playerId);
      if (!existing) {
        if (room.players.length >= room.maxPlayers) {
          safeSend(ws, {
            type: "joinResult",
            reqId: raw.reqId,
            state: null,
            error: "full" satisfies JoinError,
          });
          logger.warn({ code }, "ws: join rejected — room full");
          return;
        }
        room.players.push({
          socketId: playerId,
          name: sanitizeName(raw.playerName, `Player ${room.players.length + 1}`),
          joinedAt: Date.now(),
        });
      } else {
        // Re-joining socket (same player) — just update the name in case
        // they edited it between attempts.
        existing.name = sanitizeName(raw.playerName, existing.name);
      }
      socketIdentity.set(ws, { code, socketId: playerId });
      subscribe(ws, code);
      safeSend(ws, {
        type: "joinResult",
        reqId: raw.reqId,
        state: buildView(room, playerId),
      });
      broadcast(code);
      logger.info({ code, playerCount: room.players.length }, "ws: player joined");
      break;
    }

    case "getRoom": {
      const room = getRoom(String(raw.code || "").toUpperCase());
      safeSend(ws, {
        type: "getRoomResult",
        reqId: raw.reqId,
        meta: room ? publicMeta(room) : null,
      });
      break;
    }

    case "subscribe": {
      subscribe(ws, String(raw.code || "").toUpperCase());
      break;
    }

    case "setDigits": {
      // Only the host, only while waiting, only when the room is full —
      // this is the explicit "start the game" gesture.
      const code = String(raw.code).toUpperCase();
      const id = socketIdentity.get(ws);
      if (!id || id.code !== code) return;
      const room = getRoom(code);
      if (!room) return;
      if (!isHost(room, id.socketId)) return;
      if (room.status !== "waiting") return;
      if (room.players.length < room.maxPlayers) return;
      const digits = ([2, 3, 4] as const).includes(raw.digits) ? raw.digits : 3;
      room.digits = digits;
      room.hidden = generateHidden(digits);
      room.status = "playing";
      room.histories = new Map();
      room.winnerId = null;
      broadcast(code);
      logger.info({ code, digits }, "ws: game started");
      break;
    }

    case "guess": {
      const code = String(raw.code).toUpperCase();
      const id = socketIdentity.get(ws);
      if (!id || id.code !== code) return;
      const room = getRoom(code);
      if (!room || room.status !== "playing" || !room.hidden || !room.digits) return;
      if (!playerById(room, id.socketId)) return;
      if (!/^[0-9]+$/.test(raw.guess) || raw.guess.length !== room.digits) return;

      const fb = evaluateGuess(raw.guess, room.hidden, room.digits);
      const entry: GuessEntry = { guess: raw.guess, feedback: fb, at: Date.now() };
      const prev = room.histories.get(id.socketId) ?? [];
      room.histories.set(id.socketId, [entry, ...prev]);

      if (fb.correct) {
        room.status = "won";
        room.winnerId = id.socketId;
        // Reveal hidden + winner name to every player.
        broadcast(code);
      } else {
        // Everyone needs the updated opponent guess count, plus the guesser
        // needs their own new feedback row. A single broadcast covers both
        // since each view is built per-socket.
        broadcast(code);
      }
      break;
    }

    case "rematch": {
      const code = String(raw.code).toUpperCase();
      const id = socketIdentity.get(ws);
      if (!id || id.code !== code) return;
      const room = getRoom(code);
      if (!room) return;
      // Only the host can call for a rematch — everyone else just sees the
      // room return to the digit-picker state.
      if (!isHost(room, id.socketId)) return;
      if (room.status !== "won") return;
      room.digits = null;
      room.hidden = null;
      room.winnerId = null;
      room.histories = new Map();
      room.status = "waiting";
      room.punishmentUsed = false;
      room.punishmentLockUntil = 0;
      broadcast(code);
      logger.info({ code }, "ws: rematch armed (awaiting digits)");
      break;
    }

    case "requestPunishment": {
      const code = String(raw.code).toUpperCase();
      const id = socketIdentity.get(ws);
      const sendErr = (reason: PunishmentErrorReason) =>
        safeSend(ws, {
          type: "punishmentError",
          reqId: raw.reqId,
          code,
          reason,
        });
      if (!id || id.code !== code) return sendErr("notInRoom");
      const room = getRoom(code);
      if (!room) return sendErr("notInRoom");
      if (!playerById(room, id.socketId)) return sendErr("notInRoom");
      if (room.status !== "won") return sendErr("notWon");
      if (room.winnerId !== id.socketId) return sendErr("notWinner");
      if (room.punishmentUsed) return sendErr("alreadyUsed");
      const now = Date.now();
      // Brief mutex against double-tap; the real once-per-match gate is
      // `punishmentUsed` which we flip below before broadcasting.
      if (now < room.punishmentLockUntil) return sendErr("alreadyUsed");
      room.punishmentLockUntil = now + PUNISHMENT_LOCK_MS;
      room.punishmentUsed = true;
      const cardId =
        PUNISHMENT_CARDS[Math.floor(Math.random() * PUNISHMENT_CARDS.length)]!;
      const requester = playerById(room, id.socketId)!;
      const subs = subscribers.get(code);
      if (subs) {
        for (const peer of subs) {
          safeSend(peer, {
            type: "punishmentRevealed",
            code,
            cardId,
            drawnBy: requester.name,
          });
        }
      }
      touch(code);
      logger.info({ code, cardId, drawnBy: requester.name }, "ws: punishment drawn");
      break;
    }

    case "leave": {
      const code = String(raw.code).toUpperCase();
      const id = socketIdentity.get(ws);
      if (!id || id.code !== code) return;
      removePlayer(ws, code, id.socketId, "explicit leave");
      break;
    }

    case "ping": {
      safeSend(ws, { type: "pong", reqId: raw.reqId });
      break;
    }
  }
}

function removePlayer(
  ws: WebSocket,
  code: string,
  socketId: string,
  reason: string,
) {
  const room = getRoom(code);
  if (!room) return;
  const wasHost = isHost(room, socketId);
  const before = room.players.length;
  room.players = room.players.filter((p) => p.socketId !== socketId);
  room.histories.delete(socketId);

  // Detach from subscribers + identity so we don't leak future state.
  subscribers.get(code)?.delete(ws);
  const codes = socketRooms.get(ws);
  codes?.delete(code);
  if (socketIdentity.get(ws)?.code === code) {
    socketIdentity.delete(ws);
  }

  if (room.players.length === 0) {
    closeRoom(code, `${reason} (empty)`);
    return;
  }

  // Mid-game leaves are tolerated — the remaining players keep racing.
  // Pre-game leaves with the host departing are tolerated too: the next
  // joined player becomes the new host (they're already at index 0 after
  // the filter above). For "won" status no role changes matter.
  logger.info(
    { code, before, after: room.players.length, wasHost, reason },
    "ws: player removed",
  );
  broadcast(code);
}

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
    idFor(ws); // assign an opaque socket id eagerly
    logger.info("ws: client connected");

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
      // Drop subscriptions.
      const codes = socketRooms.get(ws);
      if (codes) {
        for (const code of codes) {
          subscribers.get(code)?.delete(ws);
          const set = subscribers.get(code);
          if (set && set.size === 0) subscribers.delete(code);
        }
      }
      // If this socket was a player, remove them from the room (which
      // promotes the next host if needed, or closes the room if empty).
      const id = socketIdentity.get(ws);
      if (id) removePlayer(ws, id.code, id.socketId, "disconnect");
    });

    ws.on("error", (err) => {
      logger.warn({ err }, "ws: socket error");
    });
  });

  logger.info("ws: game socket attached at /api/ws");
}
