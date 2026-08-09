# UzaNunua — Blueprint Part 8
## L. Infrastructure

### L.1 Environments

| Environment | Purpose | Data | Deploy trigger |
|---|---|---|---|
| Development | Local iteration | Seeded fake data via docker-compose (Postgres, Redis, Typesense, MinIO) | Manual / on save |
| Testing (CI) | Automated test execution | Ephemeral, reset per run | Every push/PR |
| Staging | Production-parity validation, demo, UAT | Realistic seeded demo data (Section 83), sanitized | Merge to `main` |
| Production | Live platform | Real data | Manual promotion after staging E2E pass |

### L.2 Deployment Topology

```
Users → CDN/Edge (static assets, image optimization, edge caching)
      → Next.js (SSR/RSC), deployed as containerized service behind a load balancer,
        horizontally scaled
      → API Gateway / Load Balancer
      → NestJS API, containerized, horizontally scaled, stateless (sessions in Redis/JWT)
      → PostgreSQL (managed, primary + read replica for reporting/analytics queries)
      → Redis (managed, cluster mode for HA)
      → Typesense (managed or self-hosted cluster)
      → S3-compatible object storage + CDN in front of media
      → Background workers (containerized, separate deployment from API) consuming
        the event bus / job queues (notifications, indexing, payouts, imports)
```

Containers orchestrated via a managed container platform (e.g., ECS/Kubernetes-equivalent); infrastructure defined as code (Terraform or equivalent) so environments are reproducible and reviewable via PR.

### L.3 CI/CD Pipeline (Section 72)

```
Commit → Lint → Type-check → Unit tests → Integration tests → Build
       → Security scan (dependency + SAST) → Deploy to Staging
       → E2E suite against staging → Manual approval gate → Deploy to Production
       → Smoke tests → Monitor
```

- Database migrations run as an explicit, reviewed pipeline step (Prisma migrate), never applied ad hoc against production.
- Feature flags (`FeatureFlag` entity) allow deploying code dark and rolling out gradually, decoupling deploy from release for risky changes (new payment provider, new recommendation engine).

### L.4 Backups & Disaster Recovery (Sections 74–75)

- Automated daily full backups + continuous WAL archiving for point-in-time recovery on PostgreSQL; backup restoration tested on a defined schedule (not just taken on faith).
- Object storage: versioning enabled, cross-region replication for critical assets (verification documents).
- **RPO target:** ≤ 15 minutes (via PITR). **RTO target:** ≤ 2 hours for full platform restoration.
- Documented runbooks per dependency failure scenario: database failover, Redis loss (degrades caching/sessions gracefully — sessions can fall back to JWT-only, cache misses hit DB), search cluster loss (falls back to Postgres trigram search per F.9), payment provider outage (checkout shows a clear "payment temporarily unavailable, try again shortly" state rather than a silent hang).

### L.5 Observability Stack

- Structured JSON logging (correlation/trace IDs propagated from request ingress through async job processing) shipped to a centralized log store.
- Metrics (API latency percentiles, error rate, payment success rate, checkout conversion, queue depth, DB query performance, search latency) exported to a metrics/dashboarding system with alerting thresholds on the business-critical ones (payment success rate, checkout error rate) treated with the same urgency as infra metrics.
- Distributed tracing across API → domain service → external provider calls, so a slow checkout can be diagnosed to the specific external dependency responsible.
- `/health`, `/health/ready`, `/health/live` endpoints per service, checking real dependency connectivity (DB, Redis, search) rather than returning a static 200.

---

## M. Implementation Roadmap

Sequenced per Section 79 of the brief, with the Section 80 rule applied to every phase: before implementing, state what's being built, dependencies, affected tables/APIs/components; implement; test; check regressions; document; only then proceed.

| Phase | Scope | Key exit criteria |
|---|---|---|
| 1. Foundation | Monorepo scaffold, CI skeleton, docker-compose dev environment, base Next.js/NestJS apps, env config | `pnpm dev` runs both apps against local Postgres/Redis |
| 2. Design system | Tokens, primitives, shadcn/ui integration, light/dark themes, base layout shell | Storybook-equivalent gallery of core components |
| 3. Authentication | Register/login/OTP/OAuth, RBAC scaffolding, sessions | A user can register, log in, and reach a role-gated page |
| 4. Catalogue | Category/Brand/Product/Variant/Inventory models + admin & seller CRUD | Seller can create a product with variants and stock |
| 5. Search | Typesense integration, indexing pipeline, basic + NL query parsing | Search returns relevant, filterable results with autocomplete |
| 6. Product pages | Full PDP per Part 2 (E.3), reviews scaffold, related/FBT | PDP meets the trust/info checklist (Section 84) |
| 7. Cart | Cart/CartItem, guest+auth merge, price/stock revalidation | Cart persists across session and device for logged-in users |
| 8. Checkout | Checkout flow, address, delivery method selection, order creation (pending) | Order created server-side with authoritative totals |
| 9. M-Pesa | Payment abstraction, STK push, webhook handling, status streaming | End-to-end paid order via STK push in staging (sandbox) |
| 10. Orders | Order state machine, seller fulfillment queue, buyer tracking UI | Order visibly progresses through real state transitions |
| 11. Customer account | Addresses, order history, preferences, security settings | Full account self-service without support intervention |
| 12. Seller platform | Onboarding/verification, dashboard, promotions, analytics, payouts | A seller can run their business end-to-end in the portal |
| 13. Admin platform | Dashboard, management modules, command center | Admin can operate seller approval, orders, payments from one place |
| 14. Inventory | Multi-warehouse, reservation, stock movement audit trail | No overselling under concurrent-order load test |
| 15. Shipping | Logistics abstraction, courier integration, delivery zones | Live tracking reflects real shipment events |
| 16. Reviews | Full review/Q&A system, verified-purchase, insight extraction | "Customers say" reflects real aggregated review data |
| 17. Promotions | Promotion engine, coupons, eligibility enforcement | Discounts apply correctly and cannot be abused past limits |
| 18. Notifications | Multi-channel infra, preferences, event-triggered sends | Order lifecycle notifications fire on real events |
| 19. Analytics | Funnel tracking, admin/seller analytics dashboards | Funnel numbers match manually verified order data |
| 20. Recommendations | Rule-based recommenders, batch jobs, homepage personalization | Personalized sections visibly differ per user behavior |
| 21. AI shopping assistant | Tool-calling agent, grounded responses, UI integration | Assistant never states a price/stock fact without a tool call behind it (verified in tests) |
| 22. Fraud controls | FraudRisk pipeline, admin review queue | Seeded fraud scenarios correctly flagged in staging |
| 23. PWA | Service worker, manifest, offline shell, push | Installable, functions offline for browse of cached content |
| 24. Performance optimization | Core Web Vitals pass, image pipeline, caching tuning | Lighthouse/CWV targets met on representative pages |
| 25. Security hardening | Full threat-model review, pen-test remediation, header/CSP audit | No critical/high findings outstanding |
| 26. Production deployment | IaC apply, DNS/CDN cutover, monitoring live, runbook rehearsal | Production smoke tests pass; rollback rehearsed |

Each phase produces working, tested, documented functionality — not scaffolding with TODOs (Sections 81–82 of the brief).

---

## N. Risk Register

| # | Risk | Category | Impact | Likelihood | Mitigation |
|---|---|---|---|---|---|
| 1 | M-Pesa STK push failures/timeouts under real network conditions | Payment | High | Medium | Idempotent retry design, explicit UI failure/retry states, authoritative server-side status, sandbox+field testing before launch |
| 2 | Overselling due to inventory race conditions at high concurrency | Marketplace/Data | High | Medium | Transactional reservation with row-level locking, load-tested before Phase 14 sign-off |
| 3 | Seller fraud (counterfeit goods, non-fulfillment) damaging buyer trust | Marketplace | High | Medium | Verification workflow, quality score, dispute process, buyer reporting, proactive monitoring |
| 4 | Payment/coupon fraud (stolen cards, promo abuse) | Security/Fraud | Medium–High | Medium | FraudRisk scoring, provider-level fraud tooling, usage-limit enforcement |
| 5 | AI assistant fabricating commerce facts (hallucinated price/stock/order info) | AI/Trust | High | Low (if architecture enforced) | Tool-calling-only grounding architecture (Part 7, K.1–K.2), automated tests asserting no ungrounded factual claims |
| 6 | Search/recommendation relevance poor at launch (cold-start, small catalogue) | Product | Medium | Medium | Rule-based recommenders tolerate cold start better than ML; manual merchandising (curated collections, CMS) fills gaps early |
| 7 | Poor performance on low-end Android / unstable networks | Performance | High | Medium | Mobile-first engineering (Section 47), aggressive payload optimization, offline shell, progressive loading, tested against throttled network profiles |
| 8 | Data breach exposing PII, payment references, or verification documents | Security | Critical | Low | Encryption at rest/in transit, least-privilege access, audit logging, no raw card storage, periodic security review |
| 9 | Financial reconciliation drift between orders/payments/commissions/payouts | Finance | High | Medium | Immutable ledger entries, transactional writes at state-change boundaries, scheduled reconciliation jobs with alerting on mismatch |
| 10 | Regulatory: Kenya Data Protection Act / payment regulation non-compliance | Legal/Compliance | High | Low–Medium | Privacy-by-design (Section J.5), legal review before production launch, documented data retention/deletion policy |
| 11 | Vendor/provider outage (M-Pesa gateway, courier, search, AI provider) cascading into checkout failure | Operational | High | Medium | Circuit breakers + defined fallback behavior per dependency (Part 3, F.9); checkout/cart/product-page never depend on non-critical services |
| 12 | Seller onboarding friction suppresses marketplace supply growth | Growth | Medium | Medium | Streamlined verification wizard, clear status visibility, support-assisted approval for edge cases |
| 13 | Scope creep vs. Section 79 phase sequencing causing schedule slippage | Delivery | Medium | High | Strict phase-gate discipline (Section 80 rule enforced every phase), explicit deferral documentation (Section 81) rather than silent scope growth |
| 14 | Multi-warehouse/location complexity underestimated in early inventory design | Technical Debt | Medium | Medium | Warehouse/Inventory schema designed for multi-location from Phase 4, not retrofitted later |
| 15 | Monolith-to-services extraction (Payments/Search) harder than anticipated later | Architecture | Medium | Low–Medium | Module boundaries and event-driven interactions designed from day one to mirror future service boundaries (Part 3, F.1/F.8) |

---

*This concludes the Section 88 blueprint (Parts 1–8). Per Section 78/88 of the brief, implementation begins at Phase 1 (Foundation) only after this blueprint is reviewed and any assumptions flagged above are confirmed or corrected.*
