# UzaNunua — Blueprint Part 3
## F. Technical Architecture

### F.1 System Overview

```
                              Users (mobile-first)
                                     │
                          CloudFront / CDN (static + edge cache)
                                     │
                         ┌───────────┴───────────┐
                         │      Next.js (SSR/     │   Presentation
                         │   RSC) — Buyer, Seller,│
                         │   Admin surfaces        │
                         └───────────┬───────────┘
                                     │  REST (OpenAPI) + WS/SSE
                          API Gateway / Load Balancer
                                     │
                         ┌───────────┴───────────┐
                         │   NestJS Modular       │   Application
                         │   Monolith (module     │
                         │   boundaries = future   │
                         │   service boundaries)   │
                         └──┬───────┬───────┬──────┘
                            │       │       │
                     PostgreSQL   Redis   Search (Typesense→
                     (Prisma)   (cache,   OpenSearch path)
                                sessions,
                                queues,
                                rate-limit)
                            │
                    S3-compatible Object Storage (images/video/docs)
                            │
                  Event Bus abstraction (in-process → RabbitMQ/Kafka/SQS)
                            │
              ┌─────────────┼─────────────┬───────────────┐
        Payment Providers  Logistics/    Notification    AI/LLM
        (M-Pesa, Stripe,   Courier       Providers        Provider
         abstraction)      abstraction   (email/SMS/push/  (Anthropic
                                          WhatsApp)         API)
```

**Architectural style:** a **modular monolith** in NestJS, not microservices, at launch. Modules are organized by domain (Catalogue, Search, Cart, Checkout, Orders, Payments, Inventory, Sellers, Promotions, Reviews, Notifications, Admin, AI) with strict boundaries — each module owns its own data access and exposes a service interface to others. This gives:
- Fast initial delivery (one deployable, one database, simple transactions)
- A credible path to extracting modules into services later (Payments and Search are the two most likely first extractions) without a rewrite, because module boundaries already mirror likely service boundaries and cross-module calls happen only through defined service interfaces / domain events, never direct data access across module lines.

### F.2 Layering (per Section 69 of the brief)

```
Presentation   → Next.js pages/components; zero business logic, only
                 data-fetching, presentation state, and calls to the
                 Application layer via typed API clients.

Application    → NestJS controllers + DTOs. Validates input, orchestrates
                 use cases, calls Domain services. No business rules live
                 here — controllers are thin.

Domain         → Services encapsulating business rules (pricing, inventory
                 reservation, order state transitions, commission
                 calculation, promotion eligibility). Framework-agnostic
                 where practical; this is the layer that is unit-tested
                 heaviest.

Infrastructure → Prisma repositories, Redis clients, search clients, S3
                 clients, payment/courier/notification provider adapters,
                 event bus implementation. Swappable behind interfaces
                 (e.g., PaymentProvider, LogisticsProvider,
                 NotificationChannel, SearchEngine).
```

Rule: **Domain services depend on infrastructure via interfaces, never concretely.** This is what makes "swap Typesense for OpenSearch later" or "add DHL alongside the current courier" additive, not a rewrite (Sections 9, 22, 27, 39, 77 of the brief).

### F.3 Frontend Architecture

- **Next.js (App Router) + TypeScript + React + Tailwind**, with Server Components as the default and Client Components used only where interactivity requires it (variant selectors, cart drawer, checkout forms, AI assistant chat, admin data tables with client-side filtering).
- Three logical frontend surfaces sharing a common design-system package and API client, deployed as one Next.js app with route groups (or three apps in the monorepo if scale later demands independent deploys):
  - `(buyer)` — public storefront
  - `(seller)` — seller portal, behind auth + seller role
  - `(admin)` — admin platform, behind auth + admin role
- Component system built on shadcn/ui primitives, themed entirely through design tokens (Part 6) — never hard-coded colors/spacing in components.
- Data fetching: Server Components fetch directly from internal API for SSR'd content (SEO-critical pages: home, category, product, seller); client-side React Query (or equivalent) for interactive/mutating flows (cart, checkout, dashboards) with optimistic updates where safe (Section E.9).
- PWA: service worker for app-shell caching + offline fallback page, installability manifest, push notification subscription flow.
- i18n: all copy in translation dictionaries (`en`, `sw` at launch) — no hard-coded UI strings — loaded via a lightweight i18n library compatible with RSC.

### F.4 Backend Architecture (NestJS)

Module inventory (each = folder with controller, service(s), DTOs, repository, tests):

```
auth/            catalogue/        search/           cart/
checkout/        payments/         orders/           inventory/
warehouses/      sellers/          promotions/       reviews/
wishlist/        notifications/    recommendations/  ai-assistant/
admin/           fraud/            analytics/        content-cms/
disputes/        returns/          commissions/      payouts/
audit/           shared/ (cross-cutting: DTO base classes,
                  guards, interceptors, exception filters)
```

- **REST + OpenAPI/Swagger** for all synchronous APIs; every endpoint documented and typed end-to-end (DTOs shared/generated into the frontend API client to eliminate drift).
- **WebSocket/SSE** for: payment status updates, order status updates, seller order-queue live updates, admin real-time dashboards.
- **Validation:** `class-validator`/`class-transformer` DTOs at the controller boundary; nothing reaches a domain service unvalidated.
- **Centralized error handling:** a global exception filter maps domain errors to consistent API error shapes (`code`, `message`, `details`), never leaking stack traces (Section 45).
- **Idempotency:** all payment-initiating and order-creating endpoints accept an idempotency key (client-generated UUID per checkout attempt), stored and checked server-side, so retries/double-taps never double-charge or double-create orders.

### F.5 Data & Caching

- **PostgreSQL** (via Prisma) is the system of record for all transactional data.
- **Redis** used for: session storage (where not JWT-stateless), rate limiting (login, OTP, checkout attempts), checkout/cart temporary state for guests, catalogue read-through caching (category pages, product summaries) with short TTL + explicit invalidation on write, distributed locks for inventory reservation, and as the backing store for BullMQ-style job queues (order confirmation emails, payout batch jobs, search re-indexing).
- **Search:** launch implementation uses **Typesense** (fast to operate, good typo-tolerance/fuzzy search out of the box, low ops burden for an initial deployment) behind a `SearchEngine` interface with adapters, so migrating to OpenSearch/Elasticsearch/Algolia later is a new adapter, not a rewrite of calling code. Product write-path publishes a `ProductIndexed`-style event so the index is eventually consistent with Postgres rather than written to synchronously inline with every request.
- **Object storage:** S3-compatible (AWS S3 or equivalent, e.g., DigitalOcean Spaces/MinIO in dev) for product media, seller verification documents (access-controlled, not public), and customer-uploaded return/dispute evidence. All uploads validated for type/size and scanned before being marked usable.

### F.6 Payments Abstraction

```
interface PaymentProvider {
  initiate(request: PaymentRequest): Promise<PaymentInitiationResult>
  getStatus(paymentId: string): Promise<PaymentStatus>
  handleWebhook(payload, signature): Promise<PaymentEvent>
  refund(paymentId: string, amount?: number): Promise<RefundResult>
}
```

Concrete adapters at launch: `MpesaSTKProvider`, `MpesaPaybillProvider`, `MpesaTillProvider`, `StripeCardProvider`. Checkout/Orders modules depend only on `PaymentProvider`; adding a new provider (e.g., a bank payment rail) never touches checkout logic. Webhook signature verification is mandatory before any payment event is trusted. Payment status is always re-derived from the provider (or provider webhook) as the source of truth — never inferred from client state (Section 16 of the brief).

### F.7 Logistics Abstraction

```
interface LogisticsProvider {
  getRatesAndEtas(origin, destination, parcel): Promise<ShippingOption[]>
  createShipment(order): Promise<Shipment>
  getTracking(shipmentId): Promise<TrackingUpdate[]>
  cancelShipment(shipmentId): Promise<void>
}
```

Launch adapter: an internal/manual courier adapter plus one third-party courier integration; architecture supports adding more couriers or a marketplace of couriers per delivery zone without touching Checkout or Orders modules (Section 22).

### F.8 Event-Driven Backbone

At launch, the event bus is an **in-process/Redis-backed pub-sub abstraction** (e.g., a thin `EventBus` interface over BullMQ pub-sub or Redis Streams) — real enough to decouple modules, cheap enough to run without standing up Kafka on day one. The interface is provider-agnostic so it can be backed by RabbitMQ/Kafka/SQS-SNS/EventBridge later without touching publishers or consumers.

Core domain events (Section 42 of the brief), each with a versioned schema:

```
UserRegistered, SellerApproved,
ProductCreated, ProductUpdated, ProductIndexed,
InventoryReserved, InventoryReleased, StockAdjusted,
OrderCreated, OrderConfirmed, OrderPacked, OrderShipped, OrderDelivered, OrderCancelled,
PaymentInitiated, PaymentCompleted, PaymentFailed,
RefundCreated, RefundCompleted,
ReviewSubmitted, ReturnRequested, DisputeOpened,
CommissionCalculated, PayoutInitiated, PayoutCompleted
```

Rule: modules communicate cross-domain effects (e.g., "reduce stock when an order is paid," "notify buyer when shipped") via events, not direct cross-module database access — this is what keeps the monolith from becoming a big ball of mud and what makes the eventual services split tractable.

### F.9 Resilience Patterns (Section 68)

- **Circuit breakers** around all external dependencies (payment provider, courier provider, search engine, AI/LLM provider, notification providers) with sane timeouts and fallback behavior defined per dependency:
  - Search down → fall back to a basic Postgres `ILIKE`/trigram query so browsing still functions in a degraded mode.
  - AI assistant/recommendations down → sections hide gracefully; product page and checkout remain fully functional (Section E.8).
  - Notification provider down → events queue and retry; user-visible order state is never blocked on notification delivery succeeding.
  - Analytics pipeline down → checkout is never gated on analytics write success (analytics events are fire-and-forget, queued, replayable).
- **Retries with backoff + dead-letter queues** for all async job processing (payment webhook processing, notification sending, search indexing, payout batches).
- **Health/readiness/liveness endpoints** per module dependency (DB, Redis, search, storage) feeding load balancer and orchestration decisions.

### F.10 Monorepo / Project Structure

```
uzanunua/
  apps/
    web/                # Next.js app (buyer + seller + admin route groups)
    api/                # NestJS application
  packages/
    design-system/      # tokens, primitives, shared components
    api-client/         # typed client generated from OpenAPI schema
    config/              # shared eslint/tsconfig/prettier
    domain-types/        # shared DTO/enum types (order status, etc.)
  infra/
    docker/
    terraform/ (or equivalent IaC)
    ci/
  docs/
    architecture/        # this blueprint, ADRs
  .env.example
```

Managed as a **pnpm/Turborepo monorepo** for shared type safety between `web` and `api` (via `domain-types` and generated `api-client`), consistent lint/format/test tooling, and coordinated CI pipelines (Section 72).

### F.11 Environments

`development` (local, docker-compose: Postgres, Redis, Typesense, MinIO) → `testing` (CI, ephemeral) → `staging` (production-parity, seeded with realistic demo data) → `production`. Config strictly via environment variables (`.env`, `.env.example` committed with placeholders only, real secrets in a secret manager — never in source control).
