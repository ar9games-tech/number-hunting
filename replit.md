# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- **AdMob (mobile only).** `react-native-google-mobile-ads` is loaded via Metro platform extensions (`adManager.ts` for native, `adManager.web.ts` no-op for web) so the web bundle never imports the native module. Banners (`AdBanner.tsx` / `AdBanner.web.tsx`) only render on `Home`, `Online lobby`, and `Settings` — never during gameplay. Interstitial fires after every 3rd completed match with a 90 s cooldown, and the manager respects the `adsRemoved` IAP entitlement synchronously so a purchase hides ads on the next render. iOS App ID and unit IDs are in `src/config/admob.ts`; in `__DEV__` builds the manager substitutes Google's official test ad units so production policy can't be breached during testing. Requires an EAS development build or TestFlight build — Expo Go does not include the native AdMob module (the manager degrades gracefully if missing).

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
