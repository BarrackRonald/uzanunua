# UzaNunua — Blueprint Part 7
## J. Security Architecture

### J.1 Authentication & Session

- Credentials: email+password (Argon2id hashing), phone+OTP, OAuth (Google at minimum for Kenyan market relevance), passkeys (WebAuthn) as an upgrade path for account security. MFA (TOTP or OTP-based) required for seller-owner and all admin/staff roles; optional but encouraged for buyers.
- Access tokens: short-lived JWT (≈15 min); refresh tokens: httpOnly, `Secure`, `SameSite=Strict` cookies, rotated on use, revocable server-side (stored session record so a compromised device can be individually logged out).
- OTP requests rate-limited per phone/IP via Redis to prevent SMS-bombing/enumeration.

### J.2 Authorization

- RBAC via `Role`/`Permission`/`UserRole` (Part 4, G.1), enforced by NestJS guards at the controller layer *and* re-checked at the domain-service layer for sensitive operations (defense in depth — a controller-level bug should not be the only thing standing between an attacker and a refund).
- Seller-staff roles are scoped to a specific `sellerId` — a compromised staff account cannot act on another seller's data even if the role name matches.
- Admin roles are further scoped by permission key (`orders:refund`, `sellers:approve`, `fraud:review`, etc.) rather than one monolithic "admin" bit, so a support agent role cannot silently gain financial-admin powers.

### J.3 Transport & Application-Layer Protections

- HTTPS everywhere (HSTS enforced), secure headers (CSP, X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy) set at the edge/CDN and app layer.
- CSRF protection on cookie-authenticated state-changing requests (double-submit token or SameSite+origin checks).
- Input validation at every API boundary (DTO validation, Part 5) — server never trusts client-supplied price, stock, discount, or total; these are always recomputed server-side from authoritative data at checkout (explicit rule, Section 32/85 of the brief).
- Output encoding / React's default escaping prevents XSS in rendered content; any HTML-accepting field (e.g., seller storefront description) is sanitized server-side against an allowlist.
- Parameterized queries throughout (Prisma) — no raw SQL string concatenation.
- Rate limiting (Redis token-bucket) on auth, OTP, checkout initiation, search, and review submission endpoints; escalating backoff on repeated failures (brute-force protection).
- Secure file upload pipeline: type/size validation, re-encoding of images (strips embedded scripts/EXIF risk), virus/malware scanning before a file is marked usable, storage in a bucket with no direct public write access.

### J.4 Secrets & Data Protection

- Secrets (DB credentials, payment provider keys, JWT signing keys, S3 credentials) live in a managed secret store (e.g., AWS Secrets Manager/Vault), injected as environment variables at deploy time — never committed, never present in frontend bundles.
- No raw card data ever touches UzaNunua's servers — card payments are tokenized directly with the provider (Stripe Elements/equivalent); UzaNunua stores only provider references.
- Encryption at rest for the database and object storage; encryption in transit everywhere (TLS 1.2+).
- PII minimization: seller verification documents and payout bank details stored encrypted with restricted access (finance/admin roles only), and excluded from general application logs.
- Audit logging (`AuditLog`, Part 4 G.12) on every admin action, refund, payout, seller approval, and permission change — immutable, queryable, exportable for investigations.

### J.5 Privacy (Section 33)

- Consent management for marketing communications and non-essential tracking, respecting Kenya Data Protection Act principles and GDPR-compatible patterns for future international users.
- Self-service data export (`GET /me/export`) and account deletion request flow, with a clearly defined retention exception for records legally required to be kept (financial/tax records), documented to the user at deletion-request time.
- Data minimization: fields are collected only where a concrete feature needs them (e.g., no collection of national ID for buyers — only for seller identity verification).

### J.6 Fraud Prevention Architecture (Section 31)

- A `FraudRisk` scoring pipeline (Part 4, G.12) evaluates signals at key moments (account creation, login, checkout, coupon redemption, refund request): purchase velocity, device/IP reputation and mismatch patterns, repeated failed payment attempts, coupon-abuse patterns (same address/device across many "first order" discounts), refund/return abuse rate, seller-side signals (sudden order spikes, high cancellation rate).
- Scoring is rule-based at launch (weighted signal scoring) with the schema and pipeline built to accept a model-based scorer later without changing the calling contract.
- High-risk orders/actions are not auto-blocked by default (to avoid false-positive harm to legitimate buyers/sellers) — they're routed to an admin review queue (`/admin/fraud/queue`) with the contributing signals visible, and only auto-blocked above a configurable severe-risk threshold (e.g., confirmed stolen-card signal from the payment provider).

### J.7 Threat Model Summary

| Threat | Primary Mitigation |
|---|---|
| Account takeover | MFA (required for seller/admin), device/session visibility, anomalous-login detection feeding FraudRisk |
| Payment fraud / stolen cards | Provider-level fraud tooling (Stripe Radar-equivalent) + FraudRisk velocity signals |
| Coupon/promo abuse | Usage-limit enforcement server-side, device/address pattern detection |
| Overselling / inventory race conditions | Transactional inventory reservation with row-level locking at reservation time |
| Seller fraud (counterfeit, non-fulfillment) | Seller quality score, verification workflow, buyer reporting, dispute process |
| Data breach | Encryption at rest/in transit, least-privilege access, secret management, audit logging |
| Price/stock tampering via client manipulation | All pricing/stock authoritative and recomputed server-side, never trusted from client payload |

---

## K. AI Architecture

### K.1 Principles

1. **Grounding over generation.** Any AI surface that states a fact about the platform (price, stock, delivery date, order status, discount, analytics figure) must retrieve that fact from an authoritative service call — never generate it from the language model's own "knowledge." This is enforced architecturally, not just by prompting: the assistant is a **tool-calling agent**, and its system prompt/tool design make unsupported factual claims structurally difficult, not merely discouraged.
2. **Fail closed, not fake.** If a required tool call fails or returns no data, the assistant says so ("I couldn't check current stock for that — here's what I can tell you...") rather than filling the gap with a plausible-sounding fabrication.
3. **AI is additive, never load-bearing for core commerce.** Search, product pages, cart, and checkout function fully with AI/recommendation services degraded or offline (Section E.8/F.9).

### K.2 AI Shopping Assistant

**Architecture:** a tool-calling agent (via the Anthropic API) with a constrained toolset backed by the same domain services the REST API uses — not a separate data path that could drift from reality.

```
Tools exposed to the assistant:
  searchProducts(query, filters)      → catalogue/search module
  getProduct(productId)               → catalogue module
  compareProducts(productIds)         → catalogue module (spec diffing)
  checkAvailability(variantId, location) → inventory module
  getDeliveryEstimate(variantId, address) → logistics module
  getCartContents(cartId)             → cart module
  addToCart(cartId, variantId, qty)   → cart module (only with explicit user confirmation)
  getOrderStatus(orderId)             → orders module (auth-scoped to the requesting user)
  getReturnPolicy(sellerId)           → sellers module
  getSellerInfo(sellerId)             → sellers module
```

- Conversation flow: user query → assistant plans tool calls → tool results returned → assistant composes a grounded, cited-to-platform-data response ("The Lenovo IdeaPad 3 is KSh 62,000, in stock in Nairobi, 8GB RAM/512GB SSD — based on your budget and use case, here's how it compares to the HP Pavilion at KSh 71,000...").
- Cart-mutating and order-related actions require explicit user confirmation in the UI before execution — the assistant never silently adds items or cancels orders.
- Every assistant session is logged (query, tool calls, response) for quality review and abuse monitoring, respecting the same privacy principles as the rest of the platform.

### K.3 Visual Search

- Image → embedding (via a vision embedding model) → nearest-neighbor lookup against a pre-computed embedding index of catalogue product images → ranked results through the same product-ranking pipeline as text search (availability, popularity, rating factored in, not raw visual similarity alone).
- Architecture is decoupled from the primary search engine (Typesense at launch) via a dedicated vector index (e.g., pgvector on Postgres at launch, or a dedicated vector store later) so visual search can evolve independently of keyword search infrastructure.

### K.4 Natural-Language Search Query Parsing

- A lightweight NLU step (can be a small/fast LLM call or a rules+embeddings hybrid) extracts structured intent (category, brand, attributes, price bounds, use-case) from free-text queries, output as a structured filter object the existing search engine already understands — the search engine itself is never asked to "understand" natural language directly, keeping ranking logic swappable and debuggable (Section 9/59).
- Low-confidence extractions apply as soft ranking boosts, not hard filters (Part 2, E.2), to avoid false empty results.

### K.5 Recommendations

- Launch: deterministic rule-based recommenders (frequently-bought-together via co-occurrence counts, same-category, same-brand, similar-price-band, browsing-history-based) computed as scheduled batch jobs writing into the `Recommendation` table (Part 4, G.10), read cheaply at request time — no live ML inference dependency on the critical path at launch.
- Evolution path (explicitly designed for, not yet built): collaborative filtering → learned embeddings for product/user similarity → a ranking model blending relevance/availability/popularity/personalization signals (Section 58/59). The `Recommendation` schema and the recommendation-serving API contract do not change across this evolution — only the job that populates the table changes, so the frontend and API layer never need to be touched to upgrade the underlying model.

### K.6 AI Admin Assistant

- Same tool-calling-agent pattern as the shopping assistant, scoped to admin-only analytics/query tools (`getSalesMetric`, `getSellerCancellationRates`, `getProductViewToPurchaseRatio`, `getCategoryTrend`, etc.), each backed by real aggregation queries against the analytics store.
- Responses explicitly separate **retrieved facts** from **generated analysis/interpretation** (e.g., "Best-selling products last month: [list, from sales data]. Analysis: this correlates with the back-to-school promotion — worth investigating whether it's promotion-driven or organic.") so operators can trust the numbers and independently evaluate the commentary.

### K.7 Safety & Cost Controls

- Per-user and per-session rate limits on assistant usage to control cost and abuse.
- System prompts explicitly scope the assistant to commerce-relevant tasks on UzaNunua; out-of-scope requests are declined conversationally rather than answered from general model knowledge, keeping the assistant's surface area (and liability) bounded to what it can actually ground in platform data.
- Model/provider choice sits behind an internal abstraction (mirroring the payment/logistics provider pattern) so the underlying LLM provider or model version can be upgraded without rewriting the agent orchestration logic.
