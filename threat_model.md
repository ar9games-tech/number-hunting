# Threat Model

## Project Overview

Number Hunt is a pnpm-workspace application with a public Express 5 API server and a mobile/web Expo client. The production server exposes a small REST surface under `/api` and a custom WebSocket game protocol under `/api/ws`; the game server keeps room, player, vote, and punishment state in process memory and does not require user authentication.

Production assumptions for this scan: `NODE_ENV=production`, the deployment is public, TLS is terminated by the platform, and the mockup sandbox is not deployed to production unless proven otherwise.

## Assets

- **Live game session integrity** — room membership, turn order, winner selection, punishments, and random matchmaking outcomes. Unauthorized joins or state tampering break gameplay and user trust.
- **Room availability** — the in-memory room registry, subscriber sets, timers, and matchmaking queue. Exhausting these resources can deny service to all players because the server is a single shared realtime process.
- **Per-room confidentiality** — hidden numbers during active rounds, player identities within a room, and private room codes intended to gate who can join a lobby.
- **Application secrets and infrastructure access** — `DATABASE_URL`, any future bearer tokens, and deployment environment variables. The current server does not meaningfully use the database yet, but compromise would still affect future features.

## Trust Boundaries

- **Client to API/WebSocket server** — every REST and WebSocket message is untrusted. All game actions, room membership, and state transitions must be enforced server-side.
- **Public internet to private room boundary** — room codes are the only gate for non-random rooms. The server must prevent easy room discovery, unauthorized joins, and disruptive abuse.
- **Server to in-memory state boundary** — untrusted client messages directly mutate process memory (`rooms`, `subscribers`, matchmaking queue, timers). Missing quotas or cleanup can become service-wide denial of service.
- **Server to database boundary** — the server can access PostgreSQL through Drizzle, though the current production path appears minimally used.
- **Production vs dev-only boundary** — `artifacts/mockup-sandbox` is treated as dev-only and normally out of scope; `artifacts/api-server` and the production-serving parts of `artifacts/number-hunt` are in scope.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/ws/game.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/number-hunt/server/serve.js`
- **Highest-risk area:** `artifacts/api-server/src/ws/game.ts` because it implements the public unauthenticated realtime protocol and owns all room state.
- **Public surfaces:** `GET /api/healthz`, WebSocket upgrades to `/api/ws`, static/mobile client delivery from `artifacts/number-hunt`.
- **Authenticated/admin surfaces:** none currently evident in production.
- **Usually dev-only:** `artifacts/mockup-sandbox/**`, local build scripts, generated `dist/**` artifacts unless needed for validation.

## Threat Categories

### Spoofing

The app currently has no account system, so identity is effectively a transient socket-bound player identity plus knowledge of a room code. The server must ensure that only the socket bound to a room/player can perform actions for that player, and that random-match or room flows cannot be abused to impersonate or replace another participant.

### Tampering

All gameplay rules are driven by client messages over WebSocket. The server must enforce room membership, turn order, punishment authority, vote eligibility, and host-only actions regardless of what the client UI does. Any client-controlled field used as an authority key must be validated against server-owned room state.

### Information Disclosure

Private rooms rely on room codes as their access control mechanism. The system must avoid exposing enough metadata or oracle behavior to make room discovery practical at internet scale, and it must never leak hidden numbers or other players' private per-turn data before a round ends.

### Denial of Service

The server stores room state, subscriptions, timers, and matchmaking state in process memory with no authentication barrier. It must bound how much memory, CPU, connection state, and timer state a single unauthenticated client can allocate, and it must rate-limit or otherwise constrain brute-force and spam traffic on the WebSocket protocol. Controls that protect private rooms or availability must survive reconnects and parallel socket churn rather than being scoped only to one transient connection object.

### Elevation of Privilege

Even without formal roles, the game has privilege boundaries: host vs non-host, winner vs loser, eligible voter vs spectator, room member vs outsider. The server must preserve those boundaries and prevent outsider actions from influencing an active room.
