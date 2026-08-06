# Agentic Coding Log — Football Contracts

This document records how the AI assistant divided work, made architectural decisions, and used subagents during the development of this project. It's written for the project owner to understand the reasoning behind the process, especially around parallelism and delegation.

---

## Project Overview

Football Contracts is a seasonal online game where users bid on football team performance contracts. It has a backend (Fastify + PostgreSQL), a frontend (Next.js), scheduled jobs, and an external football data API.

---

## Phase 0 — Research (completed by user)

Done manually by the user:
- Signed up for a **PRO subscription** at api-football.com. API key stored in root `.env`.
- Signed up for a **Railway hobby plan** for hosting backend and database.

No subagents were used here; the user handled this phase.

---

## Phase 1 — Project Scaffolding

**Date:** 2026-06-24  
**Executed by:** Main agent (inline, no subagents)

### Why no subagents here?

Phase 1 is pure scaffolding: creating directory structures, configuration files, and schema definitions. The tasks are **tightly sequential** — the schema informs backend structure, backend structure informs frontend API shape, etc. There's also no internet research required and no long-running computation. Spawning subagents here would have added overhead for no parallelism gain.

### What was created

- `docker-compose.yml` — local PostgreSQL 16 for development
- `.gitignore`
- `backend/` — Fastify + TypeScript + Prisma skeleton
- `backend/prisma/schema.prisma` — full database schema (see design decisions below)
- `frontend/` — Next.js 14 (App Router) + Tailwind skeleton

### Key architectural decisions

#### Backend framework: Fastify over Express
Fastify has built-in TypeScript support, a plugin system that makes Prisma and JWT integration clean, and better performance. For a game where auctions close in real-time and scheduled jobs run concurrently, the non-blocking plugin architecture is preferable.

#### ORM: Prisma
Chosen for type safety and clean migration workflow. Prisma's generated client makes working with enums (League, ContractPattern, ContractStatus) straightforward and catches schema issues at compile time, not runtime.

#### Database schema design — notable decisions

1. **Bid uniqueness**: `@@unique([auctionId, userId])` — one bid per user per auction. Users can update their bid by replacing it, not stacking.

2. **ContractStatus enum**: `PENDING → ACTIVE → CLOSED → FULFILLED/FAILED`. Separating CLOSED (auction done, coupons distributed) from FULFILLED (team completed pattern) lets the job system reason about each independently.

3. **Match model stores team perspective**: The `result` field stores W/D/L *from the tracked team's point of view*, along with `isHome`. This avoids having to re-derive perspective every time we evaluate contracts.

4. **Coupon count logic deferred to service layer**: The schema stores `couponCount` on Contract (snapshotted at creation time), but the actual calculation (min 5, or 10% of user count if > 50) happens in the contract creation job, not in the database. This keeps the schema simple.

5. **No ContractMatch linking table**: Contract fulfillment is checked by looking at the team's Match records *after the contract's createdAt*. We don't need to pre-assign matches to contracts; the fulfillment job queries dynamically.

#### Frontend: Next.js 14 App Router
App Router supports React Server Components, which reduces client-side JS for pages that mostly display data (leaderboard, contract lists). Auth-sensitive pages use client components.

#### Styling: Tailwind with a warm palette
The description asked for warm colors, high contrast, bold headlines, and good table readability. Tailwind's utility classes make it easy to enforce a consistent warm palette (amber/orange tones) without a heavy design system dependency.

---

---

## Phase 2 — Auth & Users

**Date:** 2026-06-24  
**Executed by:** Main agent (inline, no subagents)

### Why no subagents here?

Auth is the tightest dependency chain in the whole project: `AuthContext` → `Navbar` → `layout.tsx` → every page. Every new file references the one written before it. Splitting this across agents would require passing shared type definitions as context, which costs more than it saves.

### What was created

- `frontend/src/lib/auth.tsx` — React context holding `user`, `login()`, `logout()`. On mount it reads the JWT from `localStorage`, hits `/api/users/me` to hydrate fresh user data, and sets the Axios header. `useRequireAuth()` redirects unauthenticated users to `/auth/login`.
- `frontend/src/components/ui/Button.tsx` and `Input.tsx` — small shared primitives used across all auth forms.
- `frontend/src/components/Navbar.tsx` — shows credits and logout when authenticated, register/login links when not.
- `frontend/src/app/auth/register/page.tsx` — email + password form, switches to a "check your email" confirmation state on success.
- `frontend/src/app/auth/login/page.tsx` — on success, stores token and redirects to `/dashboard`.
- `frontend/src/app/auth/activate/page.tsx` — reads `?token=` from the URL, hits the backend, shows success or error.
- `frontend/src/app/dashboard/page.tsx` — protected shell with three stat cards (Credits / Coupons / Rank); Coupons and Rank are placeholders until Phase 3.
- `frontend/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:4000`.

### Key decisions

**No auth library (NextAuth, Clerk, etc.):** The auth flow is simple enough — email + password, one JWT, one activation step. Adding a third-party auth library would mean learning its config and working around its opinions on session storage. Rolling our own is about 80 lines and fully transparent, which also suits the pedagogical angle (user teaches React).

**localStorage for the JWT, not cookies:** Railway's hobby plan doesn't support edge functions, so `httpOnly` cookie handling via middleware isn't straightforward. `localStorage` is fine for this use case; the game doesn't handle financial transactions.

**`useRequireAuth` hook, not a layout guard:** In Next.js App Router, server-side redirects for client-only auth state require either middleware or a separate server check. Since we're doing client-side auth, a `useEffect`-based redirect hook is the simplest correct approach.

---

---

## Phase 3 — Contracts & Coupons

**Date:** 2026-06-24  
**Executed by:** Main agent (inline, no subagents)

### Why no subagents here?

The backend was already complete from Phase 1 scaffolding — all three jobs (`createContracts`, `closeAuctions`, `checkFulfillment`) and all routes (including auction bidding) were implemented as full code, not stubs. Phase 3's actual work was the team seed and four frontend files, which share types and a consistent visual pattern. Splitting them across agents would have required duplicating the type definitions and style conventions in each agent's prompt, costing more than the parallelism would save.

### What was created

- `backend/prisma/seed.ts` — Seeds 32 Swedish teams (8 per league) across all four leagues. External IDs are placeholder values; Phase 5 (API-Football integration) will replace them with real api-football.com IDs.
- `backend/package.json` — Added `db:seed` script and `prisma.seed` config pointing at the seed script.
- `frontend/src/types/api.ts` — Shared TypeScript types for `Contract`, `Team`, `AuctionSummary`, `AuctionDetail`, and `LeaderboardEntry`, consumed across all contract pages.
- `frontend/src/app/contracts/page.tsx` — Public contracts list. Splits ACTIVE (open auctions with live countdown) from closed contracts. No auth required to browse.
- `frontend/src/app/contracts/[id]/page.tsx` — Contract detail with auction stats (bid count + random sample bid). Authenticated users see a bid form (Enter key submits); unauthenticated users see a login prompt. Bidding hits the already-complete `POST /api/auctions/:id/bid` route.
- `frontend/src/app/dashboard/page.tsx` — Updated from placeholder dashes to real data: live coupon count from `/api/users/me`, rank from `/api/leaderboard`. Added coupons table with links to contract detail pages.
- `frontend/src/components/Navbar.tsx` — Added persistent "Contracts" link (left side, always visible).

### Key decisions

**Seed with placeholder IDs, not API calls:** Calling api-football.com here would create a Phase 5 dependency at Phase 3 time. Static IDs let the game logic (contract generation, frontend, bidding) be tested end-to-end with real DB rows. Phase 5 replaces IDs in one targeted migration.

**Contracts page is public, bid requires auth:** Users should be able to browse active contracts before registering — it drives conversion. The bid form degrades gracefully to a "Log in to bid" prompt. This matches the existing backend behaviour (GET routes unauthenticated, POST /bid authenticated).

**Dashboard fetches `/api/users/me` separately from auth context:** The auth context `AuthUser` only carries `id`, `email`, `credits` (the login response shape). Fetching `/api/users/me` again on the dashboard is a deliberate second call that returns the full coupon list — keeping the auth context lightweight and the dashboard data fresh.

---

---

## Phase 4 — Auctions

**Date:** 2026-06-25  
**Executed by:** Main agent (inline, no subagents)

### Why no subagents here?

The plan called for two subagents running backend and frontend in parallel. In practice the backend work was two small route changes (one new GET endpoint, one extended select), and the frontend changes depend directly on what those endpoints return. Briefing two subagents with matching endpoint specs would have cost more round-trips than just doing it inline sequentially — the work took under five minutes.

### What was created

- `backend/src/routes/auctions.ts` — Added `GET /:id/my-bid` (authenticated). Returns `{ amount, updatedAt }` for the user's own bid on this auction, or `null` if they haven't bid. This is the only endpoint that reveals a user's own bid — other users never see it.
- `backend/src/routes/users.ts` — Extended `/api/users/me` to include the user's **open** bids (where `auction.closed = false`), each with nested auction end time and contract + team data. This drives the "Active bids" section on the dashboard without a separate API call.
- `frontend/src/app/contracts/[id]/page.tsx` — Second `useEffect` fires once the auction ID and user are both known, fetches `/my-bid`, sets the bid input to the existing amount, and switches the button label to "Update" vs "Bid". Success message also distinguishes between first bid and update.
- `frontend/src/app/dashboard/page.tsx` — New "Active bids" table above the coupons table. Shows team, pattern, the user's own bid amount, and time remaining on each auction. Links to the contract detail page for updating.

### Key decisions

**Separate effect for own bid fetch:** The own-bid fetch needs both `user` (auth token) and `contract.auction.id` (from the first fetch). A single effect can't safely depend on both without either over-fetching or a race condition. Two effects — one for the contract, one for the bid — each firing when their dependencies are ready, is the cleanest React pattern here.

**`/me` returns only open bids:** Filtering `auction.closed = false` in the Prisma query means the dashboard never needs client-side filtering and the response stays small. Historical bids (from closed auctions) are not needed in the dashboard — won coupons already capture that story.

---

---

## Phase 5 — API-Football Integration

**Date:** 2026-06-25  
**Executed by:** Main agent (inline, no subagents)

### Why no subagents here?

The plan called for two subagents: one for the API client and one for the match ingestion job. In practice the `footballApi.ts` client was already complete from Phase 1, and the match ingestion logic was already wired into `checkFulfillment.ts`. The remaining work was one new script file and one small addition to the fulfillment job. The overhead of briefing two subagents with shared type context would have exceeded any parallelism gain.

### What was created / changed

- `backend/src/scripts/syncTeams.ts` — One-shot script (run with `npm run sync:teams`) that fetches all teams from api-football.com for each of the 4 leagues, fuzzy-matches them to our DB teams by name, and updates `externalId` with the real API ID. Reports exact matches, fuzzy matches (score < 0.8), and any unmatched teams that need manual review.
- `backend/package.json` — Added `sync:teams` script pointing at the new file.
- `backend/src/jobs/checkFulfillment.ts` — Added `FAILED` status: when a CLOSED contract has 3+ matches but the pattern doesn't match, the contract is now marked `FAILED`. Previously it stayed `CLOSED` indefinitely.

### Key decisions

**Fuzzy name matching, not a hardcoded map:** The API returns names like "Elfsborg" while the seed has "IF Elfsborg". A similarity function (exact → substring → shared-word-count) handles this automatically. Any match with score < 0.4 is skipped and logged so the operator can fix it manually. This is more maintainable than a static mapping that would break on any roster change.

**`dotenv/config` import in the script:** The script runs as a standalone `ts-node` process outside Fastify, so env vars need explicit loading. This mirrors how `prisma/seed.ts` is run — same pattern, no extra config.

**FAILED on season end, not after 3 games:** The original implementation marked a contract FAILED after exactly 3 games if the pattern wasn't met. This was wrong — the correct design (clarified post-Phase 5) is that a contract stays CLOSED and keeps checking until the pattern is found anywhere in the team's results, or until the season ends (November 30). The fulfillment job was corrected in Phase 6 to use a sliding 3-match window over all matches since contract creation, and to only set FAILED once `now > Nov 30`.

**League ID verification note:** The `LEAGUE_IDS` constants were set in Phase 1 by the scaffold agent. If any league returns 0 teams from the API, the sync script logs a warning prompting verification against api-football.com. The men's leagues (113 = Allsvenskan, 115 = Superettan) are confirmed. The women's league IDs (114, 116) should be verified on first run.

---

---

## Phase 6 — Dashboard & Full UI

**Date:** 2026-06-25  
**Executed by:** Main agent (inline, no subagents)

### Why no subagents here?

The plan tagged this as a subagent candidate ("isolated from backend logic"). In practice the changes were four files — a new page, a navbar tweak, and two edits to existing pages. The files share the same type imports and the same `api` client pattern established in earlier phases. Briefing a subagent with that shared context would have cost more than doing it inline.

### What was created / changed

- `frontend/src/app/leaderboard/page.tsx` — New public leaderboard page. Fetches `/api/leaderboard`, shows a ranked table of all verified users by credits. If the viewer is logged in, their row is highlighted and their rank is shown above the table. Top 3 rows get medal labels instead of numbers.
- `frontend/src/components/Navbar.tsx` — Added "Leaderboard" link alongside "Contracts" in the left nav.
- `frontend/src/app/dashboard/page.tsx` — Added "Open contracts" section: fetches `/api/contracts`, filters to ACTIVE, shows the first 5 as a compact table with team, pattern, time remaining, and a direct "Bid →" link. This fulfils the description requirement ("short list of available contracts" on the dashboard).
- `frontend/src/app/page.tsx` — Replaced the minimal hero with a full landing page: hero section, "How it works" (3 steps), a pattern reference card, and a bottom CTA. The page is fully static (no API calls) so it loads instantly.

### Key decisions

**Leaderboard is public (no auth required):** The API route already returns data unauthenticated. Making the page require login would reduce discoverability — a potential player should be able to see who's winning before they register.

**"Open contracts" fetches from the existing `/api/contracts` endpoint:** No new backend endpoint needed. The dashboard already calls `/api/users/me` and `/api/leaderboard`; adding a third parallel fetch on mount is negligible and keeps the backend surface small.

**Homepage is static:** Showing live stats (active contract count, player count) would need a new `/api/stats` endpoint and a client-side fetch, adding load-time latency for the most conversion-critical page. Static copy loads instantly and explains the game equally well.

---

---

## Phase 7 — Railway Deployment

**Date:** 2026-06-25  
**Executed by:** Main agent (inline, no subagents)

### What was created

- `backend/railway.toml` — Nixpacks builder; build step runs `npm ci && npx prisma generate && npm run build`; start step runs `npx prisma migrate deploy && npm start`. Prisma generate is at build time (generates into `node_modules`), migrate deploy is at start time (needs DATABASE_URL).
- `frontend/railway.toml` — Nixpacks builder; `npm ci && npm run build` then `npm start`.
- `backend/.env.example` — Documents every env var the backend needs, with comments explaining where each value comes from.
- `frontend/.env.example` — Documents `NEXT_PUBLIC_API_URL` with a note that it is baked into the bundle at build time (changing it requires a redeploy, not just a restart).

### Deployment checklist (manual steps)

> **Superseded by Phase 8.** The checklist below was never executed as written. The
> actual deployment was done via the Railway CLI, and the ordering problem it works
> around (deploy → read URL → set variable → redeploy) turned out to be avoidable:
> Railway will mint a domain for a service *before* its first deploy. Kept here for
> reference only.

Perform these steps in order in the Railway dashboard after pushing the code:

**Step 1 — Create two Railway services**
- Service A: root directory = `backend`
- Service B: root directory = `frontend`
- Link Service A to the existing Railway Postgres database (DATABASE_URL is auto-injected)

**Step 2 — Set backend env vars** (Service A → Variables)
| Variable | Value |
|---|---|
| `JWT_SECRET` | `openssl rand -hex 32` output |
| `JWT_EXPIRES_IN` | `7d` |
| `FOOTBALL_API_KEY` | Your api-football.com key |
| `RESEND_API_KEY` | Your Resend API key |
| `FROM_EMAIL` | Verified sender address in Resend |
| `FRONTEND_URL` | *(set after Step 4)* |

**Step 3 — Deploy the backend**
Deploy Service A. Note the generated Railway domain (e.g. `football-contracts-backend.up.railway.app`).

**Step 4 — Set frontend env vars** (Service B → Variables)
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<backend-domain>` from Step 3 |

**Step 5 — Deploy the frontend**
Deploy Service B. Note the generated Railway domain for the frontend.

**Step 6 — Wire CORS**
Set `FRONTEND_URL` on the backend service to `https://<frontend-domain>` from Step 5. Redeploy the backend.

**Step 7 — Sync team IDs**
SSH into the backend service (Railway → Service → Shell) and run:
```
cd /app && npm run sync:teams
```
This replaces placeholder team IDs with real api-football.com IDs.

### Key decisions

**`prisma migrate deploy` in startCommand, not buildCommand:** The build step runs without DATABASE_URL (Railway only injects env vars at runtime). Putting the migration in the start command means it runs on every restart, but `migrate deploy` is idempotent — it only applies unapplied migrations.

**`prisma generate` in buildCommand:** The generated Prisma client is written into `node_modules/@prisma/client`. If generation runs at start time after the build has already copied files, the imports resolve correctly, but it adds startup latency. Build time is the right place.

**`NEXT_PUBLIC_API_URL` must be set before the frontend build:** Next.js bakes `NEXT_PUBLIC_*` values into the static bundle during `next build`. If it's missing or wrong at build time, the deployed app will call the wrong URL even after you correct the env var — a full redeploy is required.

**Resend for email:** The current `RESEND_API_KEY` in `.env` is a placeholder. A real key is required for account activation emails to work in production. The free Resend tier (3 000 emails/month) is more than enough for this game's scale.

---

## Phase 8 — Repair & Live Deployment

**Date:** 2026-08-05 (after a ~6 week pause)
**Executed by:** Main agent (inline, no subagents)

### Why no subagents here?

This phase was diagnosis, not construction. Almost every step depended on the
result of the one before it — you cannot check league IDs until the API plan is
active, cannot fix the sync until you know which IDs are wrong, cannot deploy
until the build passes. A dependency chain that tight has nothing to parallelise.

### What was wrong when we came back

Phases 1–7 had been recorded as complete, and the code did typecheck. But nothing
had ever run end to end, and four separate things were broken:

1. **League IDs were wrong.** `LEAGUE_IDS` had Damallsvenskan 114, Superettan 115,
   Elitettan 116. In reality 114 *is* Superettan, 115 is Svenska Cupen, and 116 is
   not a Swedish competition at all. Only Allsvenskan (113) was right.
2. **The API subscription had lapsed to Free**, which only serves seasons 2022–2024.
   Every 2026 request failed.
3. **`syncTeams` could not insert.** It only ever called `team.update()`.
4. **`RESEND_API_KEY` was the literal string `re_placeholder`.**

The first two compounded quietly. The bad IDs made the first sync fetch the wrong
competitions, so all 16 women's-league teams kept their seed placeholders — while
Superettan picked up correct IDs *by accident*, because Svenska Cupen contains
Superettan clubs. A partly-correct database is much harder to notice than an empty
one.

### What was fixed

- `src/lib/footballApi.ts` — corrected league IDs, verified against
  `GET /leagues?country=Sweden`.
- `src/scripts/syncTeams.ts` — rewritten as a four-pass reconciliation: link by
  externalId, rescue wrong-id rows by name, insert missing, prune teams no longer in
  the four leagues. Added `--dry-run` and `--season`.
- `src/jobs/index.ts` — `checkContractFulfillment` unscheduled (see below).
- `src/app/auth/activate/page.tsx` — wrapped in a Suspense boundary; `next build`
  was failing outright.
- `GET /health` + `healthcheckPath`, `engines.node >= 20`, `next@^14.2.35`,
  a `postcss` override, and `sync:teams:prod` for running the sync without ts-node.

Result: **60 teams** (16/16/14/14) all carrying valid 2026 IDs, up from 36 of which
only 14 were usable.

### Key decisions

**Rescue-by-name is constrained to same-gender leagues.** `normalizeName` strips
`women`/`w` as club suffixes, which collapses "Örebro SK Women" and "Orebro SK" onto
the identical string. Without the guard the matcher assigns a women's API id to a
men's row at score 1.00 — confirmed live, where men's "Trelleborgs FF" would
otherwise have matched "Trelleborg W". This constraint is load-bearing; loosening the
matcher reintroduces the bug.

**Rescue updates the existing row instead of inserting a corrected one**, so a team's
`Match` and `Contract` history survives an externalId fix. Prune deletes a team's
matches but refuses to touch any team that has contracts, reporting it instead —
deleting those would destroy coupons and game history.

**The sync aborts before any writes if a league returns zero teams.** A wrong league
ID or an expired plan would otherwise look like "this league has no teams" and prune
every live team in it. That is close to how the original data got corrupted, so the
failure mode is now fatal rather than silent.

**`checkContractFulfillment` unscheduled rather than throttled.** It ran hourly and
called the API once per team — at 60 teams that is ~1440 requests/day, nearly all
returning nothing new. Unscheduling is a holding position, not a fix: while it is off,
no matches are ingested, no contract reaches FULFILLED or FAILED, and no coupon pays
out. It needs a fixture-aware cadence (fetch the league fixture list daily, pull
per-team results only on days matches were actually played) before the game is real.

**Abandoned the old database rather than migrating it.** The original Railway Postgres
sits on a different account that this login cannot see. Everything in it was
reproducible — teams from `sync:teams:prod`, matches from the API, zero contracts —
so the only loss was a single user account.

**Both domains generated before first deploy.** This removes the deploy → read URL →
set variable → redeploy loop in the Phase 7 checklist entirely.

**Deployed from GitHub source, not CLI upload.** `railway up` gave a build with no
log output at all. Connecting the repo with a per-service root directory (`/backend`,
`/frontend`) both fixed it and made pushes to `main` auto-deploy.

### Three things Railway will fail on

Worth knowing, because two of them produce almost no diagnostic output:

1. **`npm ci` in `railway.toml` buildCommand.** Nixpacks already runs an install
   phase; a second install dies with `EBUSY: resource busy or locked, rmdir
   '/app/node_modules/.cache'` because Railway has that path mounted as a cache
   volume. Let nixpacks install.
2. **Railway refuses to build on HIGH CVEs in the lockfile.** `next@14.2.5` was
   rejected before the builder started, so there was no build log — just a security
   report. The scan runs ahead of the build.
3. **Nixpacks defaults to Node 18.** Fastify's `toad-cache` already warns
   `EBADENGINE` against it. Pin `engines.node`.

### Deployment (as actually performed)

Project `football-coupons` on the hobby plan, three services:

| Service | URL |
|---|---|
| `football-coupons-backend` | https://football-coupons-backend-production.up.railway.app |
| `football-coupons-frontend` | https://football-coupons-frontend-production.up.railway.app |
| `Postgres` | internal only — no public proxy |

Verified live: `/health` 200, `/api/contracts` and `/api/leaderboard` 200,
all 7 frontend routes 200, and CORS scoped to exactly the frontend origin.

A TCP proxy was created temporarily to seed the 60 teams into the new database, then
deleted — the database is not publicly reachable. For future admin tasks, run
`railway ssh --service football-coupons-backend` from a real terminal; it needs
interactive host-key acceptance the first time.

---

## Phase 9 — Closing the Game Loop

**Date:** 2026-08-06
**Executed by:** Main agent (inline, no subagents)

### Why no subagents here?

Same reason as Phase 8, for the first half: the ingest rewrite could not be
specified until the corrupt data had been audited, and the audit could not be
written until the schema bug was understood. The second half — the end-to-end
exercise — is a single script that had to run against the same database the
first half repaired, so there was nothing to hand off.

### What was wrong

Phase 8 left fulfilment unscheduled as an explicit holding position. Rescheduling
it turned out to be the smaller half of the job; auditing the 390 match rows it
had already written surfaced two bugs that would have made the game pay out
incorrectly.

1. **`Match.externalId` was globally unique.** A fixture involves two clubs, and
   in a Swedish league match *both* are tracked teams. Ingesting the away side hit
   the home side's row: the upsert's `update` clause rewrote `result`, `homeScore`
   and `awayScore` but not `teamId`. The row then asserted that team A had achieved
   team B's result. **48 of 390 rows carried a result that contradicted their own
   score line**, and because one fixture could only ever produce one row,
   **37 of 60 teams had no match history at all**.
2. **Credits could go negative.** `POST /auctions/:id/bid` checks
   `user.credits >= amount`, but credits are not debited until the auction closes.
   With 1000 credits you could bid 1000 on ten simultaneous auctions;
   `closeAuctions` then decremented for every win unconditionally.

Neither was reachable before now — nothing had ever generated a contract, so the
payout path had never executed.

### What was fixed

- `prisma/schema.prisma` + migration `20260806090000_match_unique_per_team` —
  `@@unique([externalId, teamId])` replaces the global unique, plus an index on
  `(teamId, playedAt)` for the per-contract match read. The migration deletes the
  existing rows: the ones that were never written cannot be recovered from the
  ones that were, and re-reading the season costs four requests.
- `src/lib/footballApi.ts` — `fetchLeagueFixtures(league, season, from, to)`
  replaces `fetchFinishedFixtures(team, season)`. It also throws on a non-empty
  `errors` object, which the API returns with HTTP 200.
- `src/lib/ingestMatches.ts` (new) — league-driven ingest, one row per tracked
  side per fixture, shared by the cron job and the backfill script.
- `src/jobs/checkFulfillment.ts` — rewritten on top of it, with a 4-day rolling
  lookback. **Rescheduled** at `20 */3 * * *`.
- `src/jobs/closeAuctions.ts` — re-checks each winner's balance at settlement and
  passes the coupon down to the next bidder if they cannot pay.
- `src/scripts/ingestMatches.ts` (new) — `npm run ingest:matches`, with
  `--full` / `--days=N` / `--season=` / `--dry-run`.

### Key decisions

**Per-league fetch, not per-team.** This is what made rescheduling possible. Four
requests return every fixture in all four leagues; the per-team form spent sixty
requests to learn the same thing, because both clubs in a league match are teams we
follow. At `*/3` hours that is **32 requests/day against a 7500/day quota**, down
from ~1440. The cadence is now set by acceptable payout latency, not by quota.

**This narrows fulfilment to league matches only.** The per-team endpoint also
returned Svenska Cupen and European fixtures, so a cup result could previously
complete a WWW. One team had 36 ingested matches against a ~30-game league season.
Restricting to the four leagues is the reading the game description implies, and it
falls out of the per-league fetch for free — but it is a behaviour change, not just
an optimisation.

**Result is derived from the score line, not the API's `winner` flag.** `winner` is
`null` for a draw, which the old code relied on, but it is also `null` on fixtures
the API has not finalised. Deriving from goals makes a malformed row impossible to
mistake for a draw — and a fixture marked FT with a null score is skipped outright
rather than written as 0-0, which would otherwise be able to complete a `DDD`.

**A failed league fetch does not abort the run.** One league erroring must not look
like "no matches were played" — that is the failure mode that corrupted the original
data. The other three still ingest, and evaluation still runs against what is
already stored.

**Unaffordable winners forfeit rather than overdraw.** The alternative — reserving
credits at bid time — would mean a user's balance no longer reflects what they own,
and would need releasing on every outbid. Settling at close and passing over anyone
who cannot pay keeps one ledger and makes the auction self-consistent.

### Verified end to end

Against the live database and real ingested results, through the actual job
functions: 60 teams, **852 match rows** (426 fixtures × 2 sides), 0 rows whose
result contradicts its score line, all 60 teams covered — up from 390 rows,
48 wrong, 23 teams covered.

A tagged fixture set then drove the full loop and was deleted afterwards:
auction close assigns coupons and debits the exact bid; a bidder who cannot cover
their second win is skipped and stays at 50 credits rather than −50; a backdated
contract on Hammarby's real 2026-05-03 WWW run reaches FULFILLED and pays its two
holders 100 each; a contract with no matches in its window stays CLOSED rather than
FAILED; and a second fulfilment run pays nobody twice. 15/15 checks passed.

### Still open

Contract *generation* has still never run — the first natural batch is Wednesday
2026-08-12, 02:00 UTC. The loop is verified against contracts created by hand, so
`createWeeklyContracts` is the one link not yet exercised in production.

---

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Research (API + hosting) | Done — user |
| 1 | Project scaffolding | Done 2026-06-24 |
| 2 | Auth & Users | Done 2026-06-24 |
| 3 | Contracts & Coupons | Done 2026-06-24 |
| 4 | Auctions | Done 2026-06-25 |
| 5 | API-Football integration | Done 2026-06-25 — **corrected in Phase 8** |
| 6 | Dashboard & UI | Done 2026-06-25 |
| 7 | Deployment config | Done 2026-06-25 — **superseded by Phase 8** |
| 8 | Repair & live deployment | Done 2026-08-05 |
| 9 | Closing the game loop | Done 2026-08-06 |

### Known open items

- **`createWeeklyContracts` has never run in production.** Bidding, auction close
  and payout are now verified end to end against real results, but only on
  hand-created contracts. First natural batch: Wednesday 2026-08-12, 02:00 UTC.
- **No verified Resend domain.** Activation email only reaches the Resend account
  owner's own address, so nobody else can complete registration.
- **api-football Pro expires 2026-09-05.** Deliberate — Pro is being kept for one
  month of development and testing only. The season runs to November, so a live game
  needs it renewed.
- **Next.js 14 advisories.** A batch of them are only fixable by upgrading to Next 16,
  a major version jump. The two CVEs Railway actually blocks on are resolved.

---

*This log is updated at the start of each phase.*
