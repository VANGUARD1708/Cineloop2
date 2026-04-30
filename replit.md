# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## CineLoop App Features

### Payments (`/api/payments`)
- Three providers: Stripe, Paystack, Flutterwave (all gracefully disable if env vars missing)
- `GET /providers` returns availability + USD prices
- `POST /checkout` creates real provider checkout session, returns redirect URL
- `GET /verify` confirms payment after redirect — for subscriptions, also calls `processSuccessfulPayment` to grant Pro
- Verified webhooks at `/webhook/{provider}` — fail-closed in production:
  - **Stripe**: HMAC-SHA256 using `STRIPE_WEBHOOK_SECRET`. Sig header without secret → 400. In `NODE_ENV=production` the secret is required.
  - **Paystack**: SHA512 HMAC using `PAYSTACK_SECRET_KEY` against `x-paystack-signature`. Same fail-closed rules.
  - **Flutterwave**: `verif-hash` header compared to `FLUTTERWAVE_WEBHOOK_HASH`. Same fail-closed rules.
- Idempotency: `webhookEventsTable` (provider + eventId UNIQUE). Only PG `23505` (unique violation) is treated as duplicate; other DB errors propagate so the provider retries.
- All webhooks return HTTP 500 on processing failure (NOT 200) so providers retry.
- Pro grant flow: `processSuccessfulPayment` looks up the email used at checkout, finds-or-creates the user, sets `proUntil` (now + 30/365 days), `proPlan`, clears `proCancelAtPeriodEnd`.
- Currency conversion: USD→NGN at 1600:1 for Paystack
- Frontend: `PricingPage`, `TipJarButton`, `PayReturnPage` (auto-claims identity if signed-out user just paid)

### Identity (`/api/identity`)
- Lightweight email-only sign-in (no password). HMAC-signed cookie `cl_uid` keyed off `SESSION_SECRET`. In `NODE_ENV=production` the server refuses to start if `SESSION_SECRET` is missing or shorter than 16 chars (so cookies cannot be forged with a known default).
- Note: the claim flow does NOT verify ownership of the email — it is intentionally lightweight ("anyone with this email = this profile"), suitable for personalisation but not for account-level secrets. Adding OTP/magic-link is a future hardening step.
- `POST /claim {email}` — find-or-create user by email, set cookie, return identity.
- `GET /me` — read cookie → return current user (id, email, displayName, avatarUrl, isPro, proUntil, proPlan, proCancelAtPeriodEnd).
- `POST /signout` — clears cookie.
- Frontend: `IdentityProvider` context (`useIdentity` hook), `ClaimDialog`, `/account` page with subscription management.

### Subscription (`/api/subscription`)
- `GET /` — returns `{isPro, proUntil, proPlan, cancelAtPeriodEnd, daysRemaining}` for current user.
- `POST /cancel` — sets `pro_cancel_at_period_end=true` (Pro stays active until `proUntil`).
- `POST /resume` — clears the cancel flag.

### Watch History (`/api/watch-history`)
- `POST /` — upsert media progress for current user (uses GREATEST() so progress only ratchets up).
- `GET /continue` — returns up to 12 recently-watched, partially-completed items (5%–95% progress) sorted by `lastWatchedAt`.
- `GET /history` — full history.
- Frontend: `useWatchAnalytics` hook (called in `FeedCard` — fires at 2s/8s/20s of card visibility for 10/35/70% progress milestones); `ContinueWatchingStrip` on `/discover`.

### Search (`/api/tmdb/search`)
- Frontend: `/search` page with debounced TMDB search, All/Movies/TV chips, poster grid. SearchBar in header navigates here on Enter or "See all results".

### Error handling
- `ErrorBoundary` at App root with cinematic fallback ("Something snapped").
- Polished `/404` page with genre-styled CTAs back to feed/archive.

### Schema additions
- `users`: `email`, `display_name`, `pro_until`, `pro_plan`, `pro_cancel_at_period_end`, `last_claimed_at`
- `watch_history`: `(user_id, media_type, media_id)` unique index
- `webhook_events`: `(provider, event_id)` unique index for idempotency

### AI Mood Match (`/api/mood`)
- `POST /recommend` — takes a free-form prompt, returns 8 curated picks enriched with TMDB data
- Uses OpenAI gpt-5.4 via `@workspace/integrations-openai-ai-server` (no key needed; Replit AI Integrations proxy)
- Each pick includes: title, year, mediaType, AI reasoning, vibe tagline, TMDB poster/backdrop/rating/overview
- Frontend route `/mood` — gradient hero, prompt textarea, suggestion chips, animated card grid

### AI Director Mode (`/api/recommendations`)
Reads each user's `watch_history` and turns it into a personalized cinematic experience.

- `GET /taste-profile` (auth) — returns `{ profile, needsHistory }`. Profile includes `topGenres`, `topDecades`, `themes`, `vibe` (one-line narrative), `summary`, `historyCount`.
- `POST /refresh` (auth) — force-rebuild profile + invalidate cached for-you / mood.
- `GET /for-you` (auth) — 12 personalized picks. TMDB discover by inferred genres → AI re-rank + 1-line "Director's take" per pick. 1h cache.
- `GET /daily-mood` (auth) — today's theme `{ title, tagline, picks: 6 }`. AI proposes title+picks; if AI fails or TMDB lookups all miss, falls back to TMDB discover seeded by taste genres + day-of-year so the banner always renders. 12h cache.
- `GET /because-you-watched/:type/:id` (public) — TMDB similar+recommendations → AI top 8 + takes. 7d cache; anon users share `userId=0` cache bucket.

Schema (in `lib/db`):
- `taste_profiles` (PK `user_id`): `top_genres`, `top_decades`, `themes` (jsonb arrays), `vibe`, `summary`, `history_count` (true total, not sample size), `last_refreshed_at`.
- `recommendations_cache` (`user_id`, `cache_key` unique): `payload` jsonb, `generated_at`, `expires_at`. Used for for-you, daily-mood, byw cache entries.

Drift detection: `getOrBuildTasteProfile` rebuilds when `|true_count − persisted_count| ≥ 3` or older than 7 days. `buildTasteProfile` runs a separate `count(*)` (samples 50 rows for the prompt but persists the true total).

Implementation: `artifacts/api-server/src/lib/recommendations.ts` (all AI via `gpt-5.4`).

Frontend:
- `useDirectorMode.ts` — react-query hooks (`useTasteProfile`, `useForYou`, `useDailyMood`, `useBecauseYouWatched`, `useRefreshDirectorMode`) with stale times matching server cache TTLs.
- `components/discover/DailyMoodBanner.tsx` — cinematic banner with backdrop collage + 6 pick posters.
- `components/discover/ForYouRail.tsx` — horizontal scroller; takes appear on hover.
- `pages/TastePage.tsx` at `/taste` — "Director's read" hero, vibe quote, summary, genre/theme/decade pill clouds, refresh button.
- DiscoverPage renders `DailyMoodBanner → ForYouRail → ContinueWatchingStrip → Archive`. Both new components return `null` for anon users.
- Linked from AccountPage as "Your cinematic taste".

### Feed reactions, comments, and details (`/api/media`)
Per-media interactions keyed by `(mediaType, mediaId)` so they work for any TMDB title without needing a `posts` table.

- `GET /media/:type/:id/details` — proxies TMDB; returns `{ title, year, runtime, overview, genres, voteAverage, voteCount, tagline, seasons, episodes }`. Used for the FeedCard metadata strip.
- `GET /media/:type/:id/reactions` — public; returns `{ liked, saved, likeCount, bookmarkCount, commentCount }`. The single round-trip per card includes commentCount so we don't N+1 fetch the full comment list per visible card.
- `POST|DELETE /media/:type/:id/like` (auth) and `POST|DELETE /media/:type/:id/bookmark` (auth) — toggle persistent reactions.
- `GET /media/:type/:id/comments` — public, last 100 newest-first, joined with `users` for display name + avatar.
- `POST /media/:type/:id/comments` (auth) — body validated by zod (`text` 1–500 chars).
- `DELETE /media/comments/:commentId` (auth, owner only).

Schema (in `lib/db`):
- `media_reactions` (`user_id`, `media_type`, `media_id`, `kind` unique; kind = `like` | `bookmark`).
- `media_comments` (`user_id`, `media_type`, `media_id`, `text`, `created_at`).

Frontend:
- `useMediaReactions(type, id)` — react-query + optimistic mutate. Uses a per-instance sequence token so out-of-order responses (rapid like→unlike) cannot overwrite the latest intent; `onSettled` invalidates to converge with server truth.
- `useMediaComments(type, id, { enabled })` — list + add/remove with optimistic mutations; bumps the cached `commentCount` on the reactions query so the FeedCard badge updates instantly.
- `useMediaDetails(type, id)` — 24h staleTime since TMDB metadata is essentially static.
- `FeedCard.tsx` — poster/backdrop is the always-rendered floor with the YouTube iframe (now `youtube-nocookie.com`) fading in on top once loaded; metadata strip (year • runtime • ★ rating • genres) and expandable overview live under the title; 4-button rail (heart, message-circle, bookmark, share); 401 from the like/bookmark mutations is a soft no-op for anon users. Test ids: `feed-card`, `feed-title`, `feed-overview`, `feed-like-btn`, `feed-comment-btn`, `feed-bookmark-btn`.
- `CommentsSheet.tsx` — drag-to-dismiss bottom sheet, anonymous post shows inline "Sign in to comment.", own-comment delete button, relative timestamps. Stops `onClick`/`onPointerDown`/`onTouchStart` propagation on overlay AND body so taps inside don't trigger the FeedCard's tap-to-pause / double-tap-to-like handler. Test ids: `comments-sheet`, `comment-item`, `comment-input`, `comment-send`.
