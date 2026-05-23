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
   * Turn-based gameplay: socket id of the player whose turn it is to
   * guess. Set when the game starts (host picks digits, or random match
   * pairs), advanced after each non-winning guess. `null` while the room
   * is waiting / won / between matches. Only the player whose socket id
   * matches may submit a guess — every other guess is rejected with a
   * `turnError`.
   */
  currentTurnId: string | null;
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
  /**
   * Display name of the loser the winner chose. Broadcast to peers for UI
   * use only — NEVER used as the authorization key (names aren't
   * guaranteed unique within a room).
   */
  punishmentTargetName: string | null;
  /**
   * Stable per-connection id of the chosen target. This is the authority
   * key — only the socket whose id matches may Accept/Refuse.
   */
  punishmentTargetSocketId: string | null;
  /** Card drawn for this match, or null until used. */
  punishmentCardId: PunishmentCardId | null;
  /** Final Accept/Refuse decision from the target, or null until they pick. */
  punishmentResolution: { accepted: boolean } | null;
  /**
   * Only meaningful for the `chooseAnother` card. True on the *first*
   * reveal so the original target can pass the card to a new target;
   * flipped to false after one reassignment so the chain can't loop
   * forever. Any other card always has this as false.
   */
  punishmentCanPass: boolean;
  /**
   * True between a `redirectPunishmentTarget` and the follow-up
   * `requestPunishment` second draw. While true, the room is awaiting
   * the redirector's tap to reveal a fresh card for the new target.
   * Caps the chooseAnother chain to exactly one redirect per match.
   */
  punishmentChainActive: boolean;
  /**
   * The original target's socketId during an active redirect chain.
   * This player (a loser) is the one allowed to press Punishment again
   * to draw the second card for the newly chosen target.
   */
  punishmentRedirectedById: string | null;
  /** Display name of the redirector — UI only. */
  punishmentRedirectedByName: string | null;
};

/** Punishment cards. IDs match what the client renders in its modal. */
type PunishmentCardId =
  | "directElimination"
  | "vote"
  | "anotherChance"
  | "chooseAnother";
/**
 * Maximum number of times a single punishment can be redirected via the
 * "Choose Another Player" card. The spec caps this at 1 — once the
 * original target hands the punishment off, the second reveal must not
 * include another `chooseAnother`, otherwise targets could keep passing
 * forever. Enforced by `punishmentChainActive` + pool filtering below.
 */
const MAX_PUNISHMENT_REDIRECTS = 1;

/**
 * REMOVE BEFORE PRODUCTION — temporary 2-player testing switch for the
 * "Choose Another Player" redirect flow. When true:
 *   • the chooseAnother card is allowed in 2-player rooms (normally
 *     gated to 3+ players),
 *   • the FIRST punishment draw of any match is FORCED to chooseAnother
 *     so testers always hit the redirect path,
 *   • the punished target is allowed to redirect the punishment back to
 *     the winner (normally the winner is excluded from being a target).
 * The one-redirect cap and the rule that the second draw can NEVER be
 * chooseAnother remain enforced in both modes.
 */
const TEST_MODE = true;

/**
 * Build the punishment card pool for a single draw. The available set
 * depends on the number of players in the room and on context flags:
 *
 *   - 2 players → [directElimination, anotherChance]
 *   - 3 players → [directElimination, anotherChance, chooseAnother]
 *   - 4+ players → all four (vote unlocks at 4+)
 *
 * Then on top of the count-based pool we filter out `chooseAnother` when
 * (a) we're on the second draw of a redirect chain (cap at
 * MAX_PUNISHMENT_REDIRECTS), or (b) there's no eligible third player to
 * pass to — without this guard the target would see the "Choose
 * Another" reveal but the picker UX couldn't open.
 */
function buildPunishmentPool(
  playerCount: number,
  opts: { excludeChooseAnother: boolean },
): PunishmentCardId[] {
  const pool: PunishmentCardId[] = ["directElimination", "anotherChance"];
  if (playerCount >= 4) pool.push("vote");
  // REMOVE BEFORE PRODUCTION — TEST_MODE relaxes the 3-player gate so
  // the chooseAnother card can be drawn in 2-player rooms for testing.
  const chooseAnotherMinPlayers = TEST_MODE ? 2 : 3;
  if (playerCount >= chooseAnotherMinPlayers && !opts.excludeChooseAnother) {
    pool.push("chooseAnother");
  }
  return pool;
}

/** Brief mutex so two concurrent winner taps still produce one reveal. */
const PUNISHMENT_LOCK_MS = 2_000;

type OpponentSummary = {
  name: string;
  guessCount: number;
};

type PlayerSummary = {
  /**
   * Stable per-connection id (the player's socketId). Opaque to clients,
   * but stable enough to use as an identity key (e.g. punishment target).
   * Display names aren't guaranteed unique within a room, so anything
   * identity-sensitive must use `id`, not `name`.
   */
  id: string;
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
  /** Stable per-connection id for *this* viewer. */
  yourId: string;
  yourName: string;
  yourHistory: GuessEntry[];
  opponents: OpponentSummary[];
  status: Status;
  /** Stable id of the winner, or null. Identity authority. */
  winnerId: string | null;
  /** Display name of the winner, or null. Only set when status === "won". */
  winnerName: string | null;
  /** Only populated when status === "won". */
  revealedHidden: string | null;
  /**
   * Stable id of the player whose turn it is to guess. `null` outside
   * the playing phase. Clients gate the keypad on
   * `currentTurnId === yourId`.
   */
  currentTurnId: string | null;
  /** Display name of the current-turn player, or null. UI only. */
  currentTurnName: string | null;
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
  const currentTurnPlayer = room.currentTurnId
    ? room.players.find((p) => p.socketId === room.currentTurnId)
    : null;

  return {
    code: room.code,
    maxPlayers: room.maxPlayers,
    digits: room.digits,
    players: room.players.map((p, i) => ({
      id: p.socketId,
      name: p.name,
      isHost: i === 0,
    })),
    isHost: isHost(room, socketId),
    yourId: socketId,
    yourName: me?.name ?? "",
    yourHistory,
    opponents,
    status: room.status,
    winnerId: room.winnerId,
    winnerName: winner?.name ?? null,
    revealedHidden: room.status === "won" ? room.hidden : null,
    currentTurnId: room.currentTurnId,
    currentTurnName: currentTurnPlayer?.name ?? null,
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
  | { type: "requestPunishment"; reqId?: string; code: string; targetId: string }
  | { type: "respondPunishment"; reqId?: string; code: string; accepted: boolean }
  | { type: "redirectPunishmentTarget"; reqId?: string; code: string; newTargetId: string }
  | { type: "joinRandomQueue"; reqId?: string; playerName: string }
  | { type: "cancelRandomQueue"; reqId?: string }
  | { type: "sendReaction"; code: string; reaction: string }
  | { type: "ping"; reqId?: string };

// ---- Reactions -------------------------------------------------------------
//
// Lightweight in-room broadcast — no room state mutation. Server-side
// per-socket cooldown is the defensive backstop; the client also gates
// the send button. Reactions are ephemeral: never persisted, never
// replayed to late subscribers.
const REACTION_COOLDOWN_MS = 3000;
const REACTION_MAX_LEN = 64;
const lastReactionAt = new WeakMap<WebSocket, number>();

// ---- Random matchmaking queue ---------------------------------------------
//
// First-come-first-served queue of sockets waiting for an opponent. When a
// new socket joins:
//   - if the queue is empty → push and send `randomQueueJoined`.
//   - else → pair with the head, create a 2-player room with a randomly
//     chosen digit length, broadcast `randomMatchFound` to BOTH peers and
//     start play immediately (status="playing").
// Sockets are removed from the queue on `cancelRandomQueue` and on
// disconnect, so a stale entry can never pair with someone who's gone.

type QueueEntry = {
  ws: WebSocket;
  playerName: string;
  joinedAt: number;
};
type RandomQueueErrorReason = "alreadyQueued" | "inRoom" | "noName";

const randomQueue: QueueEntry[] = [];

function removeFromRandomQueue(ws: WebSocket): boolean {
  const idx = randomQueue.findIndex((q) => q.ws === ws);
  if (idx < 0) return false;
  randomQueue.splice(idx, 1);
  return true;
}

type PunishmentErrorReason =
  | "notInRoom"
  | "notWinner"
  | "notWon"
  | "alreadyUsed"
  | "noTarget"
  | "invalidTarget"
  | "notTarget"
  | "noPunishment"
  | "alreadyResolved";

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
      // Creating a room is mutually exclusive with random matchmaking —
      // drop any stale queue entry so the same socket can't be paired
      // into a second room behind its own back.
      removeFromRandomQueue(ws);
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
        punishmentTargetName: null,
        punishmentTargetSocketId: null,
        punishmentCardId: null,
        punishmentResolution: null,
        punishmentCanPass: false,
        punishmentChainActive: false,
        punishmentRedirectedById: null,
        punishmentRedirectedByName: null,
        histories: new Map(),
        punishmentLockUntil: 0,
        currentTurnId: null,
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
      // See note on "create" — joining a room is mutually exclusive
      // with random matchmaking.
      removeFromRandomQueue(ws);
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
      // Turn-based play: the host (players[0]) opens the round, then
      // turns rotate in join order on every non-winning guess.
      room.currentTurnId = room.players[0]?.socketId ?? null;
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
      // Turn gate. The client already disables the keypad when it's not
      // your turn, but this is the authoritative check — without it a
      // racing or malicious client could submit out of turn.
      if (room.currentTurnId !== id.socketId) {
        safeSend(ws, {
          type: "turnError",
          code,
          reason: "notYourTurn",
          currentTurnId: room.currentTurnId,
          currentTurnName:
            room.players.find((p) => p.socketId === room.currentTurnId)?.name ?? null,
        });
        return;
      }
      if (!/^[0-9]+$/.test(raw.guess) || raw.guess.length !== room.digits) return;

      const fb = evaluateGuess(raw.guess, room.hidden, room.digits);
      const entry: GuessEntry = { guess: raw.guess, feedback: fb, at: Date.now() };
      const prev = room.histories.get(id.socketId) ?? [];
      room.histories.set(id.socketId, [entry, ...prev]);

      if (fb.correct) {
        // Winner — stop turn rotation and clear the turn so no further
        // guesses can be submitted before the result screen takes over.
        room.status = "won";
        room.winnerId = id.socketId;
        room.currentTurnId = null;
        broadcast(code);
      } else {
        // Advance to the next player in join order. Wraps after the
        // last player so 2..12-player rooms all cycle correctly.
        const idx = room.players.findIndex((p) => p.socketId === id.socketId);
        const nextIdx = idx >= 0 ? (idx + 1) % room.players.length : 0;
        room.currentTurnId = room.players[nextIdx]?.socketId ?? null;
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
      // Turn is re-seeded the next time the host calls setDigits.
      room.currentTurnId = null;
      // Reset all punishment state — rematch must NEVER replay or carry
      // over a previous match's draw/decision.
      room.punishmentUsed = false;
      room.punishmentLockUntil = 0;
      room.punishmentTargetName = null;
      room.punishmentTargetSocketId = null;
      room.punishmentCardId = null;
      room.punishmentResolution = null;
      room.punishmentCanPass = false;
      room.punishmentChainActive = false;
      room.punishmentRedirectedById = null;
      room.punishmentRedirectedByName = null;
      broadcast(code);
      logger.info({ code }, "ws: rematch armed (awaiting digits)");
      break;
    }

    case "requestPunishment": {
      const code = String(raw.code).toUpperCase();
      const targetId = String(raw.targetId ?? "").trim();
      const id = socketIdentity.get(ws);
      logger.info(
        { code, socketId: id?.socketId ?? null, targetId },
        "ws: requestPunishment received",
      );
      const sendErr = (reason: PunishmentErrorReason) => {
        logger.info({ code, reason }, "ws: punishment rejected");
        safeSend(ws, {
          type: "punishmentError",
          reqId: raw.reqId,
          code,
          reason,
        });
      };
      if (!id || id.code !== code) return sendErr("notInRoom");
      const room = getRoom(code);
      if (!room) return sendErr("notInRoom");
      const requester = playerById(room, id.socketId);
      if (!requester) return sendErr("notInRoom");
      if (room.status !== "won") return sendErr("notWon");
      // Two acceptance paths:
      //   (a) First draw — winner draws once per match for a chosen loser.
      //   (b) Second draw of a chooseAnother chain — the original target
      //       (the "redirector") draws a fresh card for the new target
      //       they just picked. The chain is one-shot: validated by the
      //       three-way match below.
      const isChainSecondDraw =
        room.punishmentChainActive &&
        room.punishmentCardId === null &&
        room.punishmentRedirectedById === id.socketId &&
        room.punishmentTargetSocketId === targetId;
      if (!isChainSecondDraw) {
        if (room.winnerId !== id.socketId) return sendErr("notWinner");
        if (room.punishmentUsed) return sendErr("alreadyUsed");
      }
      if (!targetId) return sendErr("noTarget");
      // Target is keyed by stable per-connection id — names aren't
      // guaranteed unique. Target must (a) exist in the room and (b) not
      // be the winner themselves.
      const target = playerById(room, targetId);
      // REMOVE BEFORE PRODUCTION — TEST_MODE allows the chain SECOND
      // draw to land on the original winner so a 2-player room can
      // complete the full redirect flow (B picks A, A receives a fresh
      // non-chooseAnother card). The first draw still forbids winner-as-
      // target in both modes.
      const allowWinnerAsTarget = TEST_MODE && isChainSecondDraw;
      if (!target || (target.socketId === room.winnerId && !allowWinnerAsTarget)) {
        return sendErr("invalidTarget");
      }
      const now = Date.now();
      if (now < room.punishmentLockUntil) return sendErr("alreadyUsed");
      room.punishmentLockUntil = now + PUNISHMENT_LOCK_MS;
      room.punishmentUsed = true;
      // Draw a card from a pool sized to the room. The pool is filtered
      // by player count (vote unlocks at 4+, chooseAnother at 3+) and
      // then further filtered to exclude `chooseAnother` when:
      //   (a) we're on the second draw of a redirect chain — capped at
      //       MAX_PUNISHMENT_REDIRECTS = 1 to prevent endless passing.
      //   (b) no eligible redirect candidate exists (typically a
      //       2-player room — winner + 1 loser, no third to pass to).
      //       This is already implied by the player-count rule, but
      //       kept explicit so the invariant holds even if the cast of
      //       eligible players changes mid-match (e.g. winner-only
      //       exclusion rules shift).
      // REMOVE BEFORE PRODUCTION — in TEST_MODE the winner counts as an
      // eligible reassign candidate, so a 2-player room (winner + one
      // loser) reports `hasReassignCandidate=true` and the chooseAnother
      // card is allowed to roll on the first draw.
      const hasReassignCandidate = room.players.some(
        (p) =>
          p.socketId !== target.socketId &&
          (TEST_MODE || p.socketId !== room.winnerId),
      );
      const excludeChooseAnother = isChainSecondDraw || !hasReassignCandidate;
      const pool = buildPunishmentPool(room.players.length, {
        excludeChooseAnother,
      });
      // `pool` always contains at least directElimination + anotherChance,
      // so the non-null assertion is safe for any valid room state.
      // REMOVE BEFORE PRODUCTION — TEST_MODE forces the FIRST draw of a
      // match to be chooseAnother so testers always hit the redirect
      // path. The chain second draw still rolls randomly from a pool
      // that excludes chooseAnother, so the loop cap is preserved.
      const forceChooseAnother =
        TEST_MODE && !isChainSecondDraw && pool.includes("chooseAnother");
      const cardId = forceChooseAnother
        ? "chooseAnother"
        : pool[Math.floor(Math.random() * pool.length)]!;
      room.punishmentCardId = cardId;
      room.punishmentTargetName = target.name;
      room.punishmentTargetSocketId = target.socketId;
      room.punishmentResolution = null;
      // The chain (if any) ends with this reveal — clear redirect state
      // so a stale redirector can't trigger a third draw.
      if (isChainSecondDraw) {
        room.punishmentChainActive = false;
        room.punishmentRedirectedById = null;
        room.punishmentRedirectedByName = null;
      }
      // Only the first draw can grant the one-shot pass, and only when
      // the drawn card is actually chooseAnother. `hasReassignCandidate`
      // is already guaranteed here by the re-roll above (chooseAnother
      // would have been swapped out otherwise), but we keep it in the
      // expression as a defensive invariant.
      room.punishmentCanPass =
        !isChainSecondDraw &&
        cardId === "chooseAnother" &&
        hasReassignCandidate;
      const subs = subscribers.get(code);
      const peerCount = subs ? subs.size : 0;
      if (subs) {
        for (const peer of subs) {
          safeSend(peer, {
            type: "punishmentRevealed",
            code,
            cardId,
            drawnBy: requester.name,
            targetId: target.socketId,
            targetName: target.name,
            canPass: room.punishmentCanPass,
          });
        }
      }
      touch(code);
      logger.info(
        {
          code,
          cardId,
          drawnBy: requester.name,
          targetId: target.socketId,
          targetName: target.name,
          canPass: room.punishmentCanPass,
          peerCount,
        },
        "ws: punishment drawn + broadcast",
      );
      break;
    }

    case "redirectPunishmentTarget": {
      // chooseAnother flow, step 1 of 2: the current target hands the
      // punishment off to a new player. We clear the revealed card and
      // open a redirect chain — the redirector must then send a fresh
      // requestPunishment to draw a NEW random card for the new target
      // (with chooseAnother excluded on that re-draw to cap loops).
      const code = String(raw.code).toUpperCase();
      const newTargetId = String(raw.newTargetId ?? "").trim();
      const id = socketIdentity.get(ws);
      logger.info(
        { code, socketId: id?.socketId ?? null, newTargetId },
        "ws: redirectPunishmentTarget received",
      );
      const sendErr = (reason: PunishmentErrorReason) => {
        logger.info({ code, reason }, "ws: punishment redirect rejected");
        safeSend(ws, {
          type: "punishmentError",
          reqId: raw.reqId,
          code,
          reason,
        });
      };
      if (!id || id.code !== code) return sendErr("notInRoom");
      const room = getRoom(code);
      if (!room) return sendErr("notInRoom");
      const caller = playerById(room, id.socketId);
      if (!caller) return sendErr("notInRoom");
      if (
        !room.punishmentUsed ||
        !room.punishmentCardId ||
        !room.punishmentTargetSocketId
      ) {
        return sendErr("noPunishment");
      }
      if (room.punishmentResolution) return sendErr("alreadyResolved");
      // Only the current target may redirect, and only when the card is
      // chooseAnother *and* the one-pass budget is intact. The
      // punishmentChainActive flag is the same one-shot guard viewed
      // from the post-redirect side — if it's already true, someone
      // already redirected this match.
      if (id.socketId !== room.punishmentTargetSocketId) return sendErr("notTarget");
      if (
        room.punishmentCardId !== "chooseAnother" ||
        !room.punishmentCanPass ||
        room.punishmentChainActive
      ) {
        return sendErr("alreadyResolved");
      }
      if (!newTargetId) return sendErr("noTarget");
      const newTarget = playerById(room, newTargetId);
      // The new target must exist, must not be the winner (punishment
      // can only land on losers), and must not be the caller themselves.
      // REMOVE BEFORE PRODUCTION — TEST_MODE lets the target redirect
      // the punishment BACK to the winner so a 2-player room can
      // complete the full chain (B → A). Caller-as-target is still
      // forbidden in both modes.
      if (
        !newTarget ||
        (newTarget.socketId === room.winnerId && !TEST_MODE) ||
        newTarget.socketId === id.socketId
      ) {
        return sendErr("invalidTarget");
      }
      // Open the chain: clear the revealed card and remember who the
      // redirector is so only they can trigger the next draw.
      room.punishmentTargetName = newTarget.name;
      room.punishmentTargetSocketId = newTarget.socketId;
      room.punishmentCardId = null;
      room.punishmentCanPass = false;
      room.punishmentChainActive = true;
      room.punishmentRedirectedById = caller.socketId;
      room.punishmentRedirectedByName = caller.name;
      // Clear the brief mutex so the redirector's follow-up draw isn't
      // rejected by punishmentLockUntil from the original reveal.
      room.punishmentLockUntil = 0;
      const subs = subscribers.get(code);
      const peerCount = subs ? subs.size : 0;
      if (subs) {
        for (const peer of subs) {
          safeSend(peer, {
            type: "punishmentTargetChanged",
            code,
            redirectedById: caller.socketId,
            redirectedByName: caller.name,
            targetId: newTarget.socketId,
            targetName: newTarget.name,
          });
        }
      }
      touch(code);
      logger.info(
        {
          code,
          redirectedById: caller.socketId,
          newTargetId: newTarget.socketId,
          newTargetName: newTarget.name,
          peerCount,
        },
        "ws: punishment redirected + broadcast",
      );
      break;
    }

    case "respondPunishment": {
      const code = String(raw.code).toUpperCase();
      const accepted = !!raw.accepted;
      const id = socketIdentity.get(ws);
      logger.info(
        { code, socketId: id?.socketId ?? null, accepted },
        "ws: respondPunishment received",
      );
      const sendErr = (reason: PunishmentErrorReason) => {
        logger.info({ code, reason }, "ws: punishment response rejected");
        safeSend(ws, {
          type: "punishmentError",
          reqId: raw.reqId,
          code,
          reason,
        });
      };
      if (!id || id.code !== code) return sendErr("notInRoom");
      const room = getRoom(code);
      if (!room) return sendErr("notInRoom");
      const responder = playerById(room, id.socketId);
      if (!responder) return sendErr("notInRoom");
      if (
        !room.punishmentUsed ||
        !room.punishmentCardId ||
        !room.punishmentTargetSocketId
      ) {
        return sendErr("noPunishment");
      }
      if (room.punishmentResolution) return sendErr("alreadyResolved");
      // Authority key is the stored socketId, NOT the display name —
      // display names aren't guaranteed unique within a room.
      if (id.socketId !== room.punishmentTargetSocketId) return sendErr("notTarget");
      room.punishmentResolution = { accepted };
      const subs = subscribers.get(code);
      const peerCount = subs ? subs.size : 0;
      if (subs) {
        for (const peer of subs) {
          safeSend(peer, {
            type: "punishmentResolved",
            code,
            accepted,
            targetId: responder.socketId,
            targetName: responder.name,
          });
        }
      }
      touch(code);
      logger.info(
        {
          code,
          accepted,
          targetId: responder.socketId,
          targetName: responder.name,
          peerCount,
        },
        "ws: punishment resolved + broadcast",
      );
      break;
    }

    case "leave": {
      const code = String(raw.code).toUpperCase();
      const id = socketIdentity.get(ws);
      if (!id || id.code !== code) return;
      removePlayer(ws, code, id.socketId, "explicit leave");
      break;
    }

    case "sendReaction": {
      // Light-touch broadcast: validate sender is in the named room, bound
      // the reaction string, throttle per-socket, then fan out to all
      // subscribers (including the sender — clients render their own
      // floating reaction off the broadcast for symmetry).
      const code = String(raw.code || "").toUpperCase();
      const id = socketIdentity.get(ws);
      if (!id || id.code !== code) return;
      const room = getRoom(code);
      if (!room) return;
      // Reactions are an in-game feature only — drop sends during the
      // lobby (waiting) and post-match (won) phases so peers don't see
      // pop/haptic outside an active round.
      if (room.status !== "playing") return;
      const sender = playerById(room, id.socketId);
      if (!sender) return;
      const reaction = typeof raw.reaction === "string" ? raw.reaction.trim() : "";
      if (!reaction || reaction.length > REACTION_MAX_LEN) return;
      const now = Date.now();
      const last = lastReactionAt.get(ws) ?? 0;
      if (now - last < REACTION_COOLDOWN_MS) return;
      lastReactionAt.set(ws, now);

      const peers = subscribers.get(code);
      if (!peers) return;
      const payload = {
        type: "reactionReceived",
        code,
        playerId: sender.socketId,
        name: sender.name,
        reaction,
        timestamp: now,
      };
      for (const peer of peers) safeSend(peer, payload);
      break;
    }

    case "joinRandomQueue": {
      const playerName = sanitizeName(raw.playerName, "");
      const sendErr = (reason: RandomQueueErrorReason) => {
        safeSend(ws, {
          type: "randomQueueError",
          reqId: raw.reqId,
          reason,
        });
      };
      // Reject: empty name, already in a room, or already queued.
      if (!playerName) return sendErr("noName");
      // "Still in a room" guard — but auto-cleanup if that room is
      // actually finished or has vanished. This is the common case for
      // "Random Match → finish → Find Opponent again": the socket's
      // identity is still attached to the previous (now `won`) room
      // because the user navigated to result without explicitly
      // pressing Leave Room. Free the identity instead of rejecting,
      // so a stale finished room never blocks rematchmaking.
      const existing = socketIdentity.get(ws);
      if (existing) {
        const existingRoom = getRoom(existing.code);
        if (!existingRoom) {
          // Room already vanished (closed/TTL'd) — `removePlayer` bails
          // early in that case, so manually drop the dangling identity
          // + subscription bookkeeping ourselves. Without this the next
          // pairing pass would treat us as "still in a room" and skip
          // us, stranding the queue.
          socketIdentity.delete(ws);
          socketRooms.get(ws)?.delete(existing.code);
        } else if (existingRoom.status === "won") {
          removePlayer(ws, existing.code, existing.socketId, "rejoin random (stale)");
        } else {
          return sendErr("inRoom");
        }
      }
      if (randomQueue.some((q) => q.ws === ws)) return sendErr("alreadyQueued");

      // Pair with the oldest waiter, if any. Otherwise, queue and wait.
      const opponent = randomQueue.shift();
      if (!opponent) {
        randomQueue.push({ ws, playerName, joinedAt: Date.now() });
        safeSend(ws, { type: "randomQueueJoined", reqId: raw.reqId });
        logger.info(
          { queueSize: randomQueue.length, playerName },
          "ws: random queue: waiting",
        );
        return;
      }

      // Safety: opponent socket dropped between pop and pair, or somehow
      // landed in another room since being queued — discard the stale
      // entry and queue the new arrival instead of pairing.
      if (opponent.ws.readyState !== 1 || socketIdentity.get(opponent.ws)) {
        randomQueue.push({ ws, playerName, joinedAt: Date.now() });
        safeSend(ws, { type: "randomQueueJoined", reqId: raw.reqId });
        logger.info(
          { queueSize: randomQueue.length, playerName },
          "ws: random queue: opponent stale, requeued caller",
        );
        return;
      }

      const hostId = idFor(opponent.ws);
      const guestId = idFor(ws);
      // Random digit length per spec — 2, 3, or 4 — picked server-side
      // so neither player needs to vote and play starts instantly.
      const digitChoices = [2, 3, 4] as const;
      const digits = digitChoices[Math.floor(Math.random() * digitChoices.length)]!;
      let code = generateRoomCode();
      while (rooms.has(code)) code = generateRoomCode();
      const room: RoomInternal = {
        code,
        maxPlayers: 2,
        players: [
          {
            socketId: hostId,
            name: opponent.playerName,
            joinedAt: opponent.joinedAt,
          },
          {
            socketId: guestId,
            name: playerName,
            joinedAt: Date.now(),
          },
        ],
        digits,
        hidden: generateHidden(digits),
        status: "playing",
        winnerId: null,
        punishmentUsed: false,
        punishmentTargetName: null,
        punishmentTargetSocketId: null,
        punishmentCardId: null,
        punishmentResolution: null,
        punishmentCanPass: false,
        punishmentChainActive: false,
        punishmentRedirectedById: null,
        punishmentRedirectedByName: null,
        histories: new Map(),
        punishmentLockUntil: 0,
        // Random match starts in "playing" immediately — seed the turn
        // with the queue-head player (hostId) so they guess first and
        // the guest goes second.
        currentTurnId: hostId,
      };
      rooms.set(code, { room, updatedAt: Date.now() });
      socketIdentity.set(opponent.ws, { code, socketId: hostId });
      socketIdentity.set(ws, { code, socketId: guestId });
      subscribe(opponent.ws, code);
      subscribe(ws, code);
      // Send each socket its own per-player view (opponents list /
      // yourId / etc. differ per viewer). Mirror the create/join
      // pattern so the client can cache and navigate immediately.
      safeSend(opponent.ws, {
        type: "randomMatchFound",
        code,
        state: buildView(room, hostId),
      });
      safeSend(ws, {
        type: "randomMatchFound",
        reqId: raw.reqId,
        code,
        state: buildView(room, guestId),
      });
      logger.info(
        {
          code,
          digits,
          host: opponent.playerName,
          guest: playerName,
        },
        "ws: random match paired",
      );
      break;
    }

    case "cancelRandomQueue": {
      const removed = removeFromRandomQueue(ws);
      safeSend(ws, {
        type: "randomQueueCanceled",
        reqId: raw.reqId,
        removed,
      });
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
  // Capture the leaver's pre-filter index so we can advance the turn
  // cleanly if it was their turn — the player who now sits at that
  // same index is the "next" player in join order (or wraps to 0).
  const leaverIndex = room.players.findIndex((p) => p.socketId === socketId);
  const wasCurrentTurn = room.currentTurnId === socketId;
  room.players = room.players.filter((p) => p.socketId !== socketId);
  room.histories.delete(socketId);

  if (wasCurrentTurn && room.status === "playing") {
    if (room.players.length === 0) {
      room.currentTurnId = null;
    } else {
      const nextIdx =
        leaverIndex >= 0 && leaverIndex < room.players.length ? leaverIndex : 0;
      room.currentTurnId = room.players[nextIdx]?.socketId ?? null;
    }
  }

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

  // If the redirector leaves during an active chooseAnother chain (after
  // they handed the punishment off, before they re-pressed Punishment),
  // the new target would otherwise be stuck waiting for a draw that
  // can't happen. Tear the chain down cleanly: auto-refuse on behalf
  // of the (intended) new target so the room can move on. The auto-
  // resolve broadcast below still fires for the *target-left* case, so
  // here we just clear chain state and emit our own resolution.
  if (
    room.punishmentChainActive &&
    room.punishmentRedirectedById === socketId &&
    !room.punishmentResolution
  ) {
    const targetName = room.punishmentTargetName ?? "";
    const targetId = room.punishmentTargetSocketId ?? "";
    room.punishmentChainActive = false;
    room.punishmentRedirectedById = null;
    room.punishmentRedirectedByName = null;
    room.punishmentResolution = { accepted: false };
    const subs = subscribers.get(code);
    if (subs) {
      for (const peer of subs) {
        safeSend(peer, {
          type: "punishmentResolved",
          code,
          accepted: false,
          targetId,
          targetName,
        });
      }
    }
    logger.info(
      { code, targetId, targetName, reason },
      "ws: punishment chain auto-refused (redirector left)",
    );
  }

  // If the chosen punishment target left before responding, auto-resolve
  // as "refused" so the rest of the table isn't stuck on "Waiting for X
  // to decide…" forever. The result of refusing is direct elimination,
  // which is the obvious interpretation of "the target left mid-decision".
  if (
    room.punishmentUsed &&
    room.punishmentTargetSocketId === socketId &&
    !room.punishmentResolution
  ) {
    const targetName = room.punishmentTargetName ?? "";
    const targetId = room.punishmentTargetSocketId ?? "";
    room.punishmentResolution = { accepted: false };
    const subs = subscribers.get(code);
    if (subs) {
      for (const peer of subs) {
        safeSend(peer, {
          type: "punishmentResolved",
          code,
          accepted: false,
          targetId,
          targetName,
        });
      }
    }
    logger.info(
      { code, targetId, targetName, reason },
      "ws: punishment auto-refused (target left)",
    );
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
      // Always drop a disconnecting socket from the random matchmaking
      // queue so it can't be paired with a peer that's already gone.
      removeFromRandomQueue(ws);
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
