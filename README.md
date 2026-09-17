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

Still in Development, I will Keep updating
