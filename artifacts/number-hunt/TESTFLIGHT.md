# TestFlight + Online Multiplayer Setup

Online multiplayer in TestFlight requires **two** things deployed:

1. A public, always-on **API server** (the WebSocket game server).
2. An **iOS app build** that knows the server's URL.

Without step 1, the phone has nothing to connect to. Without step 2, the phone doesn't know where to look.

## Step 1 — Publish the API Server as a Reserved VM

The game keeps every room, player turn, vote, and punishment in server memory. That means you need **one** server that stays running and owns all the state — not a fleet that scales up and down.

1. Click the **Publish** button in Replit.
2. Pick the **API Server** artifact.
3. In **Advanced**, set the deployment type to **Reserved VM** (not Autoscale).
   - Reserved VM = one always-on instance, room state never disappears, WebSockets stay open.
   - Autoscale = WRONG for this app. It would split rooms across instances and kill them when traffic drops.
4. Choose a small VM size (1 vCPU / 0.5–1 GB RAM is plenty for hundreds of concurrent rooms).
5. Publish.

When it finishes you'll get a URL like `https://number-hunting-api.<your-name>.replit.app`. Copy that domain (just the host, no `https://`, no trailing slash).

## Step 2 — Point the iOS Build at the Server

Open `artifacts/number-hunt/eas.json` and replace the placeholder in `build.production.env.EXPO_PUBLIC_WS_URL`:

```json
"EXPO_PUBLIC_WS_URL": "wss://number-hunting-api.<your-name>.replit.app/api/ws"
```

Notes:

- Use `wss://` (TLS WebSocket), not `ws://`.
- The path must end with `/api/ws`.
- The client (`src/net/socketPlaceholder.ts → resolveWsUrl()`) checks `EXPO_PUBLIC_WS_URL` first, so this overrides everything else in production.

## Step 3 — Build & Upload

```bash
cd artifacts/number-hunt
eas build --platform ios --profile production
# wait for build to finish (~15-25 min), then:
eas submit --platform ios --profile production --latest
```

The TestFlight binary now connects to the public server. Two phones in different cities can both reach the same room.

## Verifying It Works

1. Install the TestFlight build on **two** devices (or one device + Replit web preview pointed at the deployed server).
2. Device A → Create Online Room → note the 4-letter code.
3. Device B → Join with that code.
4. Both should see each other in the lobby, exchange turns, and finish a match.
5. After a match, the result screen shows correctly on both devices. (No mid-game ads ever.)

If anything fails, check:

- **Server logs** in the Replit Publishing tab — look for connection errors or crashes.
- **`wss://`** scheme in the URL (a plain `ws://` will be blocked by iOS App Transport Security).
- **`/api/ws`** path is reachable — open `https://<your-domain>/api/healthz` in a browser; should return `200 OK`.

## Why Not Autoscale?

| Concern | Reserved VM | Autoscale |
|---|---|---|
| Long-lived WebSockets | ✅ stays open | ❌ killed on scale-down |
| In-memory room state | ✅ one place | ❌ split across instances |
| Cold start latency | ✅ none | ❌ first request waits |
| Players in same room → same server | ✅ guaranteed | ❌ random instance |
| Cost when idle | ❌ pays 24/7 | ✅ scales to zero |

The game can't be rewritten to use Autoscale without moving every piece of room state into Redis or Postgres — a much bigger project. Reserved VM is the right answer for now.

## Updating the Server Later

Every time you push code changes, click **Publish** again on the API Server artifact to redeploy. The TestFlight app keeps the same `EXPO_PUBLIC_WS_URL` so you don't need to rebuild the iOS binary unless the URL itself changes.
