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

type VoteChoice = "eliminate" | "stay";

/**
 * Live state of a Vote-card vote. Lives on the room while the vote is
 * open; cleared the instant the vote tallies (whether by majority,
 * timeout, or tie-break). The room is "frozen" on /result while
 * `vote.active` is true — auto-advance to the next round only fires
 * AFTER the vote resolves.
 */
type VoteState = {
  /** True between startVote and tally. */
  active: boolean;
  /** ms wall-clock deadline for the 15s countdown. */
  deadline: number;
  /** Socket id of the punished player (NOT eligible to vote). */
  targetId: string;
  /** Display name of the punished player — UI only. */
  targetName: string;
  /**
   * Socket ids of players entitled to vote: all ACTIVE players minus
   * the winner-who-drew and the target. Eliminated players never get
   * a ballot.
   */
  eligibleIds: string[];
  /** Stored ballots — one per eligible voter, at most. */
  ballots: Map<string, VoteChoice>;
  /**
   * True once the timer fired (or all eligibles voted) and the result
   * was a tie or no-votes. The winner gets a tie-break ballot; nobody
   * else acts. Tally re-fires when the winner casts.
   */
  tieBreakPending: boolean;
};

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 12;

/** 15-second voting countdown — see castVote handler + startVote helper. */
const VOTE_DURATION_MS = 15_000;
/**
 * Delay between revealing a punishment card and applying its effect
 * server-side. Long enough for the client's pack-open + reveal
 * animation to land before the room state flips (next round / vote
 * starts / elimination). chooseAnother is excluded — its effect is
 * "wait for redirect", which never auto-applies.
 */
const PUNISHMENT_EFFECT_DELAY_MS = 3_500;

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
  // ---- Session state (multi-round play) -----------------------------------
  /**
   * Monotonically-increasing round counter. 0 before the first round
   * starts; bumped to 1 by the first setDigits / random-match start,
   * then by each session-driven startNextRound. Clients use this as
   * the "the round flipped" edge to navigate from /result back to /room.
   */
  roundNumber: number;
  /**
   * Socket ids of players removed by Final Elimination or by a losing
   * Vote during this session. Sticky for the lifetime of the room —
   * eliminated players stay subscribed (can react, can spectate) but
   * cannot guess and are skipped by turn rotation. Re-joining as a new
   * socket starts fresh; we never look up by name.
   */
  eliminatedIds: Set<string>;
  /**
   * Becomes true the moment the session has a definitive outcome:
   *   • 2-player room: Final Elimination removes the only opponent.
   *   • 3+-player room: only one active player remains.
   * Frozen state — no further rounds start, no new punishments roll.
   * `status` stays "won" while sessionEnded is true so clients keep
   * showing the result screen, but with the session-over UI instead.
   */
  sessionEnded: boolean;
  /** Socket id of the session-winner once `sessionEnded === true`. */
  sessionWinnerId: string | null;
  /** Display name of the session-winner — UI only. */
  sessionWinnerName: string | null;
  /** Active Vote-card state, or null when no vote is open. */
  vote: VoteState | null;
  /**
   * Handle for the 15s vote countdown timer so we can cancel it on
   * room close / all-voted / disconnect-tally. Cleared whenever
   * `vote` is cleared.
   */
  voteTimer: ReturnType<typeof setTimeout> | null;
  /**
   * Handle for the deferred `applyPunishmentEffect` scheduled
   * PUNISHMENT_EFFECT_DELAY_MS after a card is revealed. Cleared on
   * apply, on chooseAnother redirects (where the chain second draw
   * schedules its own timer), and on room teardown.
   */
  effectTimer: ReturnType<typeof setTimeout> | null;
  /**
   * True for rooms created by the random-match pairing path. These
   * rooms are one-shot — no punishments roll, no rounds after the first
   * win, and the session freezes the instant someone guesses correctly.
   */
  random: boolean;
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
const TEST_MODE = false;

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
  activeCount: number,
  opts: { excludeChooseAnother: boolean },
): PunishmentCardId[] {
  // Punishments are disabled entirely for 2-active-player sessions.
  // The result screen also hides the Punishment button when active < 3,
  // and `requestPunishment` rejects the call on the server — this empty
  // pool is the third belt-and-braces guard.
  // REMOVE BEFORE PRODUCTION — TEST_MODE keeps the legacy 2-player pool
  // (directElimination + anotherChance) so single-pair test rooms can
  // still exercise the punishment pipeline.
  if (activeCount < 3) {
    return TEST_MODE ? ["directElimination", "anotherChance"] : [];
  }
  // 3+ active players — Final Elimination + Forgiveness are always
  // available. Vote unlocks at 4+ active. Choose Another unlocks at
  // 3+ active and is suppressed by the redirect-chain cap.
  const pool: PunishmentCardId[] = ["directElimination", "anotherChance"];
  if (activeCount >= 4) pool.push("vote");
  if (!opts.excludeChooseAnother) {
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
  // ---- Session state (multi-round play) -----------------------------------
  /** Monotonically-increasing round counter. Used by the client to detect
   * round-flips and navigate from /result back to /room. */
  roundNumber: number;
  /** Stable ids of players eliminated this session. Order-independent. */
  eliminatedIds: string[];
  /** True if THIS viewer was eliminated. Used to lock the keypad and
   * render the spectator banner. */
  youAreEliminated: boolean;
  /** True once the session has a definitive winner. `status` stays "won"
   * but the result screen renders the session-over view instead of the
   * per-round result + punishment UI. */
  sessionEnded: boolean;
  /** Stable id of the session winner, or null. */
  sessionWinnerId: string | null;
  /** Display name of the session winner, or null. */
  sessionWinnerName: string | null;
  /** Active Vote-card payload, or null. Live counts only — no ballots
   * are leaked per-voter. */
  vote: VoteView | null;
};

/**
 * Per-viewer projection of the live vote. Same shape for all viewers
 * except `youAreEligible` / `youHaveVoted`, which are personalized to
 * the requester. Counts are aggregate only (no per-voter names).
 */
type VoteView = {
  active: boolean;
  /** ms wall-clock deadline for the 15s countdown. */
  deadlineAt: number;
  /** Stable id of the punished player. */
  targetId: string;
  /** Display name of the punished player. */
  targetName: string;
  /** Total number of eligible voters (denominator for the live counter). */
  eligibleCount: number;
  /** Total ballots received so far (numerator for the live counter). */
  votedCount: number;
  /** Live tally: how many have voted to eliminate. */
  eliminateCount: number;
  /** Live tally: how many have voted to keep. */
  stayCount: number;
  /** True if this viewer is allowed to cast a ballot. */
  youAreEligible: boolean;
  /** True if this viewer has already cast a ballot. */
  youHaveVoted: boolean;
  /** True once the vote has tied (or no one voted) and the winner owns
   * the tie-break decision. Nobody else acts in this state. */
  tieBreakPending: boolean;
  /** Stable id of the winner (the player who owns the tie-break). */
  winnerId: string;
  /** Display name of the winner. */
  winnerName: string;
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

  let voteView: VoteView | null = null;
  if (room.vote) {
    const v = room.vote;
    let eliminateCount = 0;
    let stayCount = 0;
    for (const choice of v.ballots.values()) {
      if (choice === "eliminate") eliminateCount++;
      else stayCount++;
    }
    const winnerName =
      room.players.find((p) => p.socketId === room.winnerId)?.name ?? "";
    voteView = {
      active: v.active,
      deadlineAt: v.deadline,
      targetId: v.targetId,
      targetName: v.targetName,
      eligibleCount: v.eligibleIds.length,
      votedCount: v.ballots.size,
      eliminateCount,
      stayCount,
      youAreEligible: v.eligibleIds.includes(socketId),
      youHaveVoted: v.ballots.has(socketId),
      tieBreakPending: v.tieBreakPending,
      winnerId: room.winnerId ?? "",
      winnerName,
    };
  }

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
    roundNumber: room.roundNumber,
    eliminatedIds: [...room.eliminatedIds],
    youAreEliminated: room.eliminatedIds.has(socketId),
    sessionEnded: room.sessionEnded,
    sessionWinnerId: room.sessionWinnerId,
    sessionWinnerName: room.sessionWinnerName,
    vote: voteView,
  };
}

// ---- Session helpers -------------------------------------------------------
//
// "Session" = a sequence of rounds in a single room driven by Punishment
// outcomes. A round ends when someone guesses correctly; the punishment
// the winner applies determines whether the session continues (next
// round starts automatically) or terminates (only one active player
// left). All round-state mutation goes through these helpers so the
// invariants stay in one place.

/** Players who can still guess this session. */
function activePlayers(room: RoomInternal): Player[] {
  return room.players.filter((p) => !room.eliminatedIds.has(p.socketId));
}

/**
 * Clear per-round state but preserve session state (roundNumber,
 * eliminatedIds, sessionEnded/winner). Used by `startNextRound` to wipe
 * the previous round's histories, hidden number, winner, punishment
 * fields, and vote state before re-seeding "playing".
 */
function clearRoundState(room: RoomInternal) {
  room.winnerId = null;
  room.histories = new Map();
  room.hidden = null;
  room.currentTurnId = null;
  // Punishment fields — reset all of them. Anything else here would
  // let a previous round's draw bleed into the next.
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
  // Cancel any pending vote / scheduled effect — should already be
  // null by the time we get here, but be defensive.
  if (room.voteTimer) {
    clearTimeout(room.voteTimer);
    room.voteTimer = null;
  }
  room.vote = null;
  if (room.effectTimer) {
    clearTimeout(room.effectTimer);
    room.effectTimer = null;
  }
}

/**
 * Start a fresh round in a session that's still running. Generates a
 * new hidden number, seeds the turn with the first active player in
 * join order, bumps `roundNumber`, and broadcasts. Skipped (caller
 * should call `endSession` instead) if only one active player remains.
 */
function startNextRound(room: RoomInternal) {
  if (room.sessionEnded) return;
  if (!room.digits) return;
  const active = activePlayers(room);
  if (active.length <= 1) {
    // Single survivor — promote them to session winner and freeze.
    const survivor = active[0] ?? null;
    endSession(room, survivor?.socketId ?? null);
    return;
  }
  clearRoundState(room);
  room.hidden = generateHidden(room.digits);
  room.status = "playing";
  room.currentTurnId = active[0]?.socketId ?? null;
  room.roundNumber += 1;
  broadcast(room.code);
  logger.info(
    { code: room.code, roundNumber: room.roundNumber, active: active.length },
    "ws: next round started",
  );
}

/**
 * Eliminate `socketId` from the session. Idempotent. Does NOT proceed
 * to the next round — caller is responsible for invoking
 * `proceedAfterPunishment` once any in-flight UI (modals, animations)
 * is done.
 */
function eliminatePlayer(room: RoomInternal, socketId: string) {
  room.eliminatedIds.add(socketId);
  logger.info({ code: room.code, socketId }, "ws: player eliminated");
}

/**
 * Freeze the session with `winnerSocketId` as the session winner.
 * `status` stays "won" so the result screen keeps showing; clients
 * branch on `sessionEnded` to render the session-over view.
 */
function endSession(room: RoomInternal, winnerSocketId: string | null) {
  if (room.sessionEnded) return;
  room.sessionEnded = true;
  room.sessionWinnerId = winnerSocketId;
  const w = winnerSocketId
    ? room.players.find((p) => p.socketId === winnerSocketId)
    : null;
  room.sessionWinnerName = w?.name ?? null;
  room.status = "won";
  room.currentTurnId = null;
  if (room.voteTimer) {
    clearTimeout(room.voteTimer);
    room.voteTimer = null;
  }
  if (room.effectTimer) {
    clearTimeout(room.effectTimer);
    room.effectTimer = null;
  }
  room.vote = null;
  broadcast(room.code);
  logger.info(
    { code: room.code, winnerId: winnerSocketId },
    "ws: session ended",
  );
}

/**
 * Called after a punishment effect resolves. If two or fewer active
 * players remain AND we just removed the only opponent of a 2-player
 * room → endSession. If one active player remains → endSession.
 * Otherwise → startNextRound.
 */
function proceedAfterPunishment(room: RoomInternal) {
  if (room.sessionEnded) return;
  const active = activePlayers(room);
  if (active.length <= 1) {
    endSession(room, active[0]?.socketId ?? null);
    return;
  }
  startNextRound(room);
}

/**
 * Open a 15-second Vote on the punished target. Eligible voters =
 * active players minus the winner and minus the target. If nobody is
 * eligible (degenerate 2-player corner case), fast-forward to the
 * winner's tie-break ballot so the room never stalls.
 */
function startVote(room: RoomInternal, targetId: string, targetName: string) {
  if (room.sessionEnded) return;
  if (!room.winnerId) return;
  const winnerId = room.winnerId;
  const eligibleIds = activePlayers(room)
    .map((p) => p.socketId)
    .filter((id) => id !== winnerId && id !== targetId);
  if (room.voteTimer) clearTimeout(room.voteTimer);
  room.vote = {
    active: true,
    deadline: Date.now() + VOTE_DURATION_MS,
    targetId,
    targetName,
    eligibleIds,
    ballots: new Map(),
    // If there's nobody to vote, jump straight to the tie-break path
    // and let the winner decide.
    tieBreakPending: eligibleIds.length === 0,
  };
  if (eligibleIds.length === 0) {
    room.voteTimer = null;
    broadcast(room.code);
    logger.info(
      { code: room.code, targetId, eligible: 0 },
      "ws: vote opened with no eligible voters (tie-break to winner)",
    );
    return;
  }
  room.voteTimer = setTimeout(() => {
    room.voteTimer = null;
    tallyVote(room);
  }, VOTE_DURATION_MS);
  broadcast(room.code);
  logger.info(
    { code: room.code, targetId, eligible: eligibleIds.length },
    "ws: vote opened",
  );
}

/**
 * Tally the open vote and either apply the result or hand the decision
 * to the winner as a tie-break.
 */
function tallyVote(room: RoomInternal) {
  const v = room.vote;
  if (!v || !v.active) return;
  let eliminateCount = 0;
  let stayCount = 0;
  for (const choice of v.ballots.values()) {
    if (choice === "eliminate") eliminateCount++;
    else stayCount++;
  }
  if (eliminateCount === stayCount) {
    // Tie (including no-votes). Park the vote in tie-break mode and
    // wait for the winner's castTieBreak. Eligible voters can no
    // longer cast; the room sits frozen until the winner decides.
    v.active = false;
    v.tieBreakPending = true;
    if (room.voteTimer) {
      clearTimeout(room.voteTimer);
      room.voteTimer = null;
    }
    broadcast(room.code);
    logger.info(
      { code: room.code, targetId: v.targetId, eliminateCount, stayCount },
      "ws: vote tied — awaiting winner tie-break",
    );
    return;
  }
  const result: VoteChoice = eliminateCount > stayCount ? "eliminate" : "stay";
  applyVoteResult(room, result);
}

/**
 * Resolve the vote with `result` and advance the session. Clears the
 * vote state before proceeding so the next round's view doesn't carry
 * a stale vote.
 */
function applyVoteResult(room: RoomInternal, result: VoteChoice) {
  const v = room.vote;
  if (!v) return;
  const targetId = v.targetId;
  if (room.voteTimer) {
    clearTimeout(room.voteTimer);
    room.voteTimer = null;
  }
  room.vote = null;
  if (result === "eliminate") {
    eliminatePlayer(room, targetId);
  }
  // Either way, the next round (or session end) follows.
  proceedAfterPunishment(room);
}

/**
 * Apply a revealed punishment card's effect. Called after a short
 * delay so the client reveal animation can finish before the room
 * flips. chooseAnother is intentionally a no-op here — the chain
 * second draw will schedule its own apply.
 */
function applyPunishmentEffect(room: RoomInternal) {
  if (room.sessionEnded) return;
  const cardId = room.punishmentCardId;
  const targetId = room.punishmentTargetSocketId;
  const targetName = room.punishmentTargetName ?? "";
  room.effectTimer = null;
  if (!cardId || !targetId) return;
  switch (cardId) {
    case "directElimination": {
      eliminatePlayer(room, targetId);
      proceedAfterPunishment(room);
      break;
    }
    case "anotherChance": {
      // Forgiveness — no elimination. Move directly to the next round.
      proceedAfterPunishment(room);
      break;
    }
    case "vote": {
      startVote(room, targetId, targetName);
      break;
    }
    case "chooseAnother": {
      // No-op — the original target picks a new player, and the chain
      // second draw will schedule the real effect.
      break;
    }
  }
}

/**
 * Schedule the effect to apply after the standard reveal delay. Cancels
 * any previously-scheduled effect first (defensive — there should never
 * be one pending at this point, but a stale timer would be hard to
 * debug).
 */
function scheduleApplyEffect(room: RoomInternal) {
  if (room.effectTimer) clearTimeout(room.effectTimer);
  room.effectTimer = setTimeout(() => {
    applyPunishmentEffect(room);
  }, PUNISHMENT_EFFECT_DELAY_MS);
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
  // Cancel any pending session timers BEFORE we drop the room from the
  // registry, so a late-firing applyEffect / tallyVote can't try to
  // operate on a torn-down room.
  const r = rooms.get(code)?.room;
  if (r?.voteTimer) {
    clearTimeout(r.voteTimer);
    r.voteTimer = null;
  }
  if (r?.effectTimer) {
    clearTimeout(r.effectTimer);
    r.effectTimer = null;
  }
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
  | { type: "leave"; code: string }
  | { type: "requestPunishment"; reqId?: string; code: string; targetId: string }
  | { type: "redirectPunishmentTarget"; reqId?: string; code: string; newTargetId: string }
  | { type: "castVote"; reqId?: string; code: string; choice: VoteChoice }
  | { type: "castTieBreak"; reqId?: string; code: string; choice: VoteChoice }
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
  | "alreadyResolved"
  | "notAllowed";

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
        roundNumber: 0,
        eliminatedIds: new Set(),
        sessionEnded: false,
        sessionWinnerId: null,
        sessionWinnerName: null,
        vote: null,
        voteTimer: null,
        effectTimer: null,
        random: false,
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
      // First round of a session — bump the round counter. Subsequent
      // rounds are started by `startNextRound` after punishment effects.
      room.roundNumber = 1;
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
      // Eliminated players keep their subscription (so they can react /
      // spectate) but can never submit a guess. The client already
      // hides the keypad for them; this is the authoritative gate.
      if (room.eliminatedIds.has(id.socketId)) {
        safeSend(ws, {
          type: "turnError",
          code,
          reason: "eliminated",
          currentTurnId: room.currentTurnId,
          currentTurnName:
            room.players.find((p) => p.socketId === room.currentTurnId)?.name ?? null,
        });
        return;
      }
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
        // Random-match rooms are one-shot — there are no punishments
        // and no follow-up rounds, so freeze the session here.
        if (room.random) {
          room.sessionEnded = true;
          room.sessionWinnerId = id.socketId;
          room.sessionWinnerName = playerById(room, id.socketId)?.name ?? null;
        }
        broadcast(code);
      } else {
        // Advance to the next ACTIVE player in join order. We rotate
        // through the full player list (so join order is preserved
        // across the session) and skip eliminated ones. There's always
        // at least one active player here — eliminated guessers are
        // rejected above, so the current turn is by definition active.
        const order = room.players;
        const idx = order.findIndex((p) => p.socketId === id.socketId);
        let next: string | null = null;
        for (let step = 1; step <= order.length; step++) {
          const candidate = order[(idx + step) % order.length];
          if (candidate && !room.eliminatedIds.has(candidate.socketId)) {
            next = candidate.socketId;
            break;
          }
        }
        room.currentTurnId = next;
        broadcast(code);
      }
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
      // Eliminated players are session-spectators — a punishment can
      // never be aimed at someone already out of the session. Without
      // this gate a stale client could revive a spectator into the
      // vote/effect pipeline and produce nonsensical state.
      if (room.eliminatedIds.has(target.socketId)) {
        return sendErr("invalidTarget");
      }
      // Punishments are disabled for 2-active-player sessions. The
      // /result screen hides the Punishment button below this threshold,
      // but a racing/stale client could still reach the server — reject
      // explicitly so the empty pool never fires a degenerate draw.
      // REMOVE BEFORE PRODUCTION — TEST_MODE allows 2-player rooms
      // through so the punishment pipeline can be exercised in tests.
      if (!TEST_MODE && activePlayers(room).length < 3) {
        return sendErr("notAllowed");
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
      //
      // Both `hasReassignCandidate` and the pool size are computed
      // against ACTIVE players only — eliminated session-spectators
      // can't be redirect targets and shouldn't widen the pool past
      // its real-cast thresholds (vote unlocks at 4+ active, etc).
      const active = activePlayers(room);
      const hasReassignCandidate = active.some(
        (p) =>
          p.socketId !== target.socketId &&
          (TEST_MODE || p.socketId !== room.winnerId),
      );
      const excludeChooseAnother = isChainSecondDraw || !hasReassignCandidate;
      const pool = buildPunishmentPool(active.length, {
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
      // Schedule the effect to apply after the reveal animation lands.
      // chooseAnother is a no-op in applyPunishmentEffect — the chain
      // second draw will schedule its own timer for the new card.
      scheduleApplyEffect(room);
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
        newTarget.socketId === id.socketId ||
        // Reassign cannot land on a session-spectator.
        room.eliminatedIds.has(newTarget.socketId)
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
      // Cancel any pending applyPunishmentEffect from the first draw —
      // for chooseAnother the effect is a no-op, but defensively
      // canceling here means a future change to the apply path can't
      // double-fire.
      if (room.effectTimer) {
        clearTimeout(room.effectTimer);
        room.effectTimer = null;
      }
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

    case "castVote": {
      // Vote-card ballot. Validated: room exists, vote is open, the
      // sender is on the eligible list, and they haven't already voted.
      // We tally immediately once all eligibles have voted so the room
      // doesn't sit idle for the rest of the 15s window.
      const code = String(raw.code).toUpperCase();
      const choice: VoteChoice = raw.choice === "stay" ? "stay" : "eliminate";
      const id = socketIdentity.get(ws);
      if (!id || id.code !== code) return;
      const room = getRoom(code);
      if (!room) return;
      const v = room.vote;
      if (!v || !v.active || v.tieBreakPending) return;
      if (!v.eligibleIds.includes(id.socketId)) return;
      if (v.ballots.has(id.socketId)) return;
      v.ballots.set(id.socketId, choice);
      touch(code);
      if (v.ballots.size >= v.eligibleIds.length) {
        // Everyone voted — tally now. broadcast() fires inside the
        // tally → apply path, so we don't need to broadcast here.
        tallyVote(room);
      } else {
        broadcast(code);
      }
      break;
    }

    case "castTieBreak": {
      // Tie-break ballot — only the winner may cast, and only when the
      // vote is parked in tieBreakPending. Resolves the round.
      const code = String(raw.code).toUpperCase();
      const choice: VoteChoice = raw.choice === "stay" ? "stay" : "eliminate";
      const id = socketIdentity.get(ws);
      if (!id || id.code !== code) return;
      const room = getRoom(code);
      if (!room) return;
      const v = room.vote;
      if (!v || !v.tieBreakPending) return;
      if (room.winnerId !== id.socketId) return;
      applyVoteResult(room, choice);
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
        // Random match is a single-round pairing — sessionEnded is
        // set to true the moment someone wins (see the guess handler
        // for the random-match branch). Session helpers are still
        // present so the type stays uniform.
        roundNumber: 1,
        eliminatedIds: new Set(),
        sessionEnded: false,
        sessionWinnerId: null,
        sessionWinnerName: null,
        vote: null,
        voteTimer: null,
        effectTimer: null,
        random: true,
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
    // Advance to the next ACTIVE player in join order — same rotation
    // rule as the post-guess advance. Walking only the surviving list
    // would silently route to an eliminated spectator in a multi-round
    // session and stall the round.
    const order = room.players;
    const start = leaverIndex >= 0 ? leaverIndex : 0;
    let next: string | null = null;
    for (let step = 0; step < order.length; step++) {
      const candidate = order[(start + step) % order.length];
      if (candidate && !room.eliminatedIds.has(candidate.socketId)) {
        next = candidate.socketId;
        break;
      }
    }
    room.currentTurnId = next;
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

  // If the redirector leaves during an active chooseAnother chain
  // (after they handed the punishment off, before they re-pressed
  // Punishment), the new target would otherwise be stuck. Treat the
  // chain as forgiven and advance the session.
  if (
    room.punishmentChainActive &&
    room.punishmentRedirectedById === socketId
  ) {
    room.punishmentChainActive = false;
    room.punishmentRedirectedById = null;
    room.punishmentRedirectedByName = null;
    if (room.effectTimer) {
      clearTimeout(room.effectTimer);
      room.effectTimer = null;
    }
    logger.info(
      { code, reason },
      "ws: punishment chain dropped (redirector left), advancing session",
    );
    proceedAfterPunishment(room);
  }

  // If the original target leaves before any punishment effect lands,
  // treat the punishment as forgiven and advance. (Eliminated leavers
  // simply stop spectating — no punishment is in flight for them.)
  //
  // Mid-vote/mid-tiebreak target leaves are a separate case: an active
  // vote whose subject has disconnected is moot — cancel the vote +
  // timers FIRST so we don't auto-advance while a decision is in flight
  // for a player who is no longer there.
  if (
    room.punishmentUsed &&
    room.punishmentTargetSocketId === socketId &&
    !room.eliminatedIds.has(socketId)
  ) {
    if (room.vote && (room.vote.active || room.vote.tieBreakPending)) {
      room.vote = null;
      if (room.voteTimer) {
        clearTimeout(room.voteTimer);
        room.voteTimer = null;
      }
      logger.info(
        { code, reason },
        "ws: vote cancelled — target left mid-vote",
      );
    }
    if (room.effectTimer) {
      clearTimeout(room.effectTimer);
      room.effectTimer = null;
    }
    logger.info(
      { code, reason },
      "ws: punishment target left mid-effect, advancing session",
    );
    proceedAfterPunishment(room);
  }

  // If an eligible voter leaves mid-vote, drop their pending ballot
  // and re-tally if everyone remaining has now voted. Failing to do
  // this would leave the room stuck on a 15s timer when N-1 of N
  // eligibles already voted and the missing one disconnects.
  if (room.vote && room.vote.active) {
    const v = room.vote;
    const beforeEligible = v.eligibleIds.length;
    v.eligibleIds = v.eligibleIds.filter((vid) => vid !== socketId);
    v.ballots.delete(socketId);
    if (beforeEligible !== v.eligibleIds.length) {
      if (v.eligibleIds.length === 0) {
        // Nobody left to vote — go straight to the winner's tie-break.
        v.active = false;
        v.tieBreakPending = true;
        if (room.voteTimer) {
          clearTimeout(room.voteTimer);
          room.voteTimer = null;
        }
      } else if (v.ballots.size >= v.eligibleIds.length) {
        tallyVote(room);
      }
    }
  }

  // The session winner cannot leave gracefully mid-tie-break (the room
  // would be stuck), so if they do, end the session with whoever is
  // left as the winner (or just close the room if nobody is left).
  if (
    room.vote &&
    room.vote.tieBreakPending &&
    room.winnerId === socketId
  ) {
    room.vote = null;
    if (room.voteTimer) {
      clearTimeout(room.voteTimer);
      room.voteTimer = null;
    }
    proceedAfterPunishment(room);
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
