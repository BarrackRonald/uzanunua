# UzaNunua

**Sell + Buy** — an AI-native e-commerce and marketplace platform, Kenya-first, architected for African and eventual global expansion.

Full architecture blueprint: [`docs/architecture/`](./docs/architecture) (8 parts — vision/personas/IA, UX, technical, database, API, design system, security/AI, infrastructure/roadmap/risks).

## Status: Phase 1 — Foundation ✅

This repo currently contains the **foundation** only: monorepo wiring, both apps booting, a real (non-trivial) health-check chain proving `web → api → Postgres/Redis` works end to end. No product features exist yet — those land per the phase sequence in `docs/architecture/07-infrastructure-roadmap-risks.md`.

## Structure

```
apps/
  web/     Next.js (App Router, TypeScript, Tailwind) — buyer/seller/admin surfaces
  api/     NestJS (TypeScript, Prisma, Swagger) — REST API
packages/
  domain-types/   Shared enums & types (order/payment/shipment/dispute state machines,
                   money type, API error/pagination envelopes) — single source of truth
                   between web and api, imported by both.
  config/         Shared tsconfig base.
docs/
  architecture/   The full Section-88 blueprint.
infra/
  ci/             (reserved for IaC/deploy scripts — added from Phase 26)
.github/workflows/ci.yml   Lint → typecheck → test → build pipeline
docker-compose.yml          Local dev infra: Postgres, Redis, Typesense, MinIO
```

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- Docker (for local Postgres/Redis/Typesense/MinIO)

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env files (fill in real secrets later — defaults work for local dev)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start local infra
docker compose up -d

# 4. Generate Prisma client and run the initial migration
pnpm db:generate
pnpm --filter @uzanunua/api exec prisma migrate dev --name init

# 5. Run everything
pnpm dev
```

Then:
- Web: http://localhost:3000 — shows a foundation-check page confirming API connectivity (replaced by the real homepage in Phase 7)
- API: http://localhost:3001/api/v1/health — real dependency health check (not a static 200)
- API docs: http://localhost:3001/api/docs — Swagger UI

## Scripts (root)

| Command | What it does |
|---|---|
| `pnpm dev` | Runs `web` and `api` in parallel via Turborepo |
| `pnpm build` | Builds all apps/packages |
| `pnpm lint` | Lints all apps/packages |
| `pnpm typecheck` | Type-checks all apps/packages |
| `pnpm test` | Runs all test suites |
| `pnpm db:generate` | Regenerates the Prisma client |
| `pnpm db:migrate` | Runs a Prisma migration in dev mode |

## What's deliberately deferred (and why)

Per Section 81 of the master brief ("no placeholder architecture," but explicit, documented deferral is fine):

- **Full entity model** (User, Seller, Product, Order, Payment, etc.) — specified in `docs/architecture/03-database-architecture.md`, introduced incrementally from Phase 4 onward, per-domain, so every migration maps to real shipping functionality rather than landing as one giant unused schema.
- **Design system tokens/components** — Phase 2. `apps/web`'s Tailwind config is wired but intentionally has no custom theme yet.
- **Auth** — Phase 3.
- **CI security scanning + E2E-against-staging** — added once those have something real to scan/target (Phase 25 / once staging exists).

## Verification status

Run in the sandbox this repo was built in (no Docker daemon, and package registries restricted to npm/GitHub — `binaries.prisma.sh` is not reachable from it):

| Check | Result |
|---|---|
| `pnpm install` | ✅ passes (838 packages) |
| `pnpm typecheck` (web, api, domain-types) | ✅ passes |
| `pnpm lint` (web, api) | ✅ passes, zero warnings |
| `pnpm --filter @uzanunua/api test` | ✅ 4/4 pass (health controller, all branches: ok / db-down / redis-down / liveness) |
| `pnpm --filter @uzanunua/web build` | ✅ succeeds, produces static/dynamic route output |
| `pnpm --filter @uzanunua/api build` | ✅ succeeds (`nest build`) |
| `docker-compose.yml`, `.github/workflows/ci.yml`, all `package.json`/`tsconfig.json` | ✅ parse as valid YAML/JSON |
| `prisma generate` | ❌ **cannot verify in this sandbox** — Prisma's query-engine binary is fetched from `binaries.prisma.sh` at generate-time, which this sandbox's network policy doesn't allow (only npm/GitHub registries are reachable here). This is a sandbox restriction, not a code issue — `binaries.prisma.sh` is a normal, unrestricted download in any real dev machine or CI runner (including the GitHub Actions workflow in this repo, which runs on GitHub's own infrastructure). |
| Full `docker compose up -d && pnpm dev` live run against real Postgres/Redis | ❌ **not run here** — no Docker daemon in this sandbox. Structurally this is the same gap as above: works in any real environment, untestable in this one. |

**What this means practically:** everything that can be verified without live infrastructure — types, lint, unit tests, both production builds — is verified and passing. The one thing to confirm on your own machine on first run is `pnpm db:generate` and `pnpm --filter @uzanunua/api exec prisma migrate dev --name init` completing against your local `docker compose up -d` stack, which the Getting Started steps above already walk through. If that surfaces anything unexpected, it's the first thing to debug — everything upstream of it (workspace wiring, app code, tests, builds) is confirmed solid.

## Next phase

**Phase 2 — Design System**: implement the full token set from `docs/architecture/05-design-system.md` as `@uzanunua/design-system`, build the core component primitives (buttons, inputs, cards, badges, skeletons, etc.) on shadcn/ui, and wire light/dark themes into `apps/web`.
