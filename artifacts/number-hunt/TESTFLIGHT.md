# TestFlight + Online Multiplayer Setup (Railway)

Online multiplayer in TestFlight requires **two** things deployed:

1. A public, always-on **API server** on Railway (handles WebSockets + room state).
2. An **iOS app build** that knows the Railway URL.

Without step 1, the phone has nothing to connect to. Without step 2, the phone doesn't know where to look.

---

## Step 1 — Deploy the API server to Railway

The game keeps every room, player turn, vote, and punishment in server memory, so it needs **one** always-on instance — Railway gives you exactly that.

### One-time setup

1. Go to https://railway.com → sign up (GitHub login is easiest).
2. Push this repo to GitHub if you haven't already:
   ```bash
   git remote add origin https://github.com/<your-user>/<your-repo>.git
   git push -u origin main
   ```
3. In Railway: **New Project → Deploy from GitHub repo → pick your repo**.
4. Railway will auto-detect the `Dockerfile` at the repo root and start building.
5. Once it builds, click the service → **Settings → Networking → Generate Domain**.
   - You'll get a URL like `https://number-hunting-production.up.railway.app`.
6. (Optional) Add a `DATABASE_URL` env var under **Variables** if/when you wire DB features. The current build doesn't require it.

### What's already configured for you

- `Dockerfile` (at repo root) — multi-stage build, bundles `dist/index.mjs` into a tiny final image.
- `.dockerignore` — excludes the mobile app and dev junk so builds are fast.
- `railway.json` — tells Railway to use the Dockerfile, healthcheck `/api/healthz`, auto-restart on failure.
- Server reads `PORT` from env (Railway sets it automatically).
- WebSocket support is built into Railway by default — no extra config needed.

### Verify

Open `https://<your-railway-domain>/api/healthz` in a browser. You should see `{"status":"ok"}` or similar 200 response. If you get an error, check the **Deployments → Logs** tab in Railway.

---

## Step 2 — Point the iOS build at Railway

Open `artifacts/number-hunt/eas.json` and replace the placeholder in `build.production.env.EXPO_PUBLIC_WS_URL`:

```json
"EXPO_PUBLIC_WS_URL": "wss://number-hunting-production.up.railway.app/api/ws"
```

Notes:
- Use `wss://` (TLS WebSocket), not `ws://` — iOS App Transport Security blocks plain `ws://`.
- The path must end with `/api/ws`.
- The client (`src/net/socketPlaceholder.ts → resolveWsUrl()`) reads `EXPO_PUBLIC_WS_URL` first, so this overrides everything in the production binary.

---

## Step 3 — Build & upload the iOS binary

```bash
cd artifacts/number-hunt
eas build --platform ios --profile production
# wait ~15–25 min, then:
eas submit --platform ios --profile production --latest
```

The new TestFlight build connects to Railway. Two phones in different cities can now share a room.

---

## Verifying end-to-end

1. Install the TestFlight build on **two** devices.
2. Device A → Create Online Room → note the 4-letter code.
3. Device B → Join with that code.
4. Both should see each other in the lobby and finish a full match.
5. No mid-game ads ever. Interstitial fires only after every 3rd completed match.

If anything fails:
- **Railway logs:** Service → Deployments → click the latest → Logs.
- **`wss://`** scheme in the URL (not `ws://`).
- **`/api/ws`** path is reachable.
- **`/api/healthz`** returns 200.

---

## Why Railway and not Replit Autoscale?

| Concern | Railway | Replit Autoscale |
|---|---|---|
| Long-lived WebSockets | ✅ stays open | ❌ killed on scale-down |
| In-memory room state | ✅ one instance | ❌ split across instances |
| Cold-start latency | ✅ none | ❌ first request waits |
| Players in same room → same server | ✅ guaranteed | ❌ random instance |
| Cost | ✅ ~$5/mo free credit covers small game | depends on traffic |
| Dockerfile-based | ✅ first-class | partial |

Reserved VM on Replit would also work, but Railway is simpler if you prefer it and the free tier easily covers a small game.

---

## Updating the server later

Every time you push to GitHub's `main` branch, Railway redeploys automatically. The TestFlight app keeps the same `EXPO_PUBLIC_WS_URL`, so you don't need to rebuild the iOS binary unless the URL itself changes.

To redeploy manually: Railway → service → **Deployments → Redeploy**.
