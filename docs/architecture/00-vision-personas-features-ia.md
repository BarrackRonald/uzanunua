# UzaNunua — Blueprint Part 1
## Product Vision · Personas · Feature Map · Information Architecture

---

## A. Product Vision

**UzaNunua** ("Sell + Buy", Swahili) is an AI-native commerce operating system, not a storefront. It is the layer that lets any Kenyan seller — from a single-person Instagram boutique to an established retail chain — run real commerce, and lets any Kenyan buyer discover, evaluate, and receive products with as little friction as sending money on M-Pesa.

**The core bet:** in a mobile-first, price-sensitive, trust-scarce market, the platform that wins is the one that (1) makes trust legible in every screen — verified sellers, real stock, honest delivery estimates — and (2) removes friction at the two hardest moments in African e-commerce: *finding the right product* and *paying for it reliably on a low-end Android phone with an unstable connection*.

**What UzaNunua is:**
- A marketplace connecting many sellers to many buyers, with platform-level trust, fulfillment, and payment guarantees.
- An AI-assisted discovery layer (natural-language search, a commerce-aware shopping assistant, visual search) that reduces the cognitive load of choosing between near-identical products.
- An M-Pesa-first, payment-agnostic checkout that never lies about payment state.
- A merchant operating system: inventory, pricing, promotions, fulfillment, analytics, payouts — good enough that a serious seller could run their whole business on it.
- An admin nerve center giving Anthropic-grade (i.e., real) operational visibility into revenue, fraud, inventory, and marketplace health.

**What UzaNunua is not:**
- Not a CRUD product catalogue with a cart bolted on.
- Not a single-vendor store pretending to be a marketplace.
- Not an AI gimmick — the assistant retrieves real platform data or says it doesn't know; it never invents prices, stock, or delivery dates.
- Not visually "African" through stock-photo cliché — the identity is expressed through language (English/Swahili), currency (KSh), payment behavior (M-Pesa-first), and product/seller mix, not through tribal-pattern skins.

**North-star metrics:**
- Checkout conversion rate (product page → paid order)
- M-Pesa payment success rate (STK push initiated → confirmed)
- Seller activation rate (registered → first sale within 30 days)
- Repeat purchase rate within 90 days
- Search-to-purchase rate (searches that end in an add-to-cart within session)

---

## B. Personas

Each persona includes goals, pain points, and the primary surfaces they use.

### 1. Guest Shopper
- **Goals:** Browse and evaluate quickly without commitment; decide whether to trust the platform at all.
- **Pain points:** Doesn't know if the platform/seller is legitimate; abandons if forced to register early.
- **Primary surfaces:** Homepage, search, category pages, product page, guest checkout.
- **Design implication:** Full browse + cart + guest checkout must work with zero account creation. Trust signals (verified badges, reviews, return policy) must be visible pre-purchase.

### 2. Registered Buyer
- **Goals:** Fast repeat purchases, order tracking, personalized discovery, managing multiple addresses/payment methods.
- **Pain points:** Re-entering delivery/payment details; losing track of orders across sellers; irrelevant recommendations.
- **Primary surfaces:** Account dashboard, order history/tracking, wishlist, personalized homepage, AI assistant.

### 3. Seller (Merchant Owner)
- **Goals:** Get discovered, convert visits into sales, manage stock accurately, get paid on time, understand what's working.
- **Pain points:** Overselling due to poor inventory sync; slow or opaque payouts; no visibility into why products aren't converting.
- **Primary surfaces:** Seller onboarding, seller dashboard, product/inventory management, order fulfillment queue, payouts, analytics.

### 4. Seller Staff
- **Goals:** Execute day-to-day operations (pack orders, update stock, respond to customers) without access to financial/payout data.
- **Pain points:** Owner-only tools force the owner into operational bottlenecks.
- **Primary surfaces:** Scoped seller dashboard (RBAC-limited: orders, inventory, messages — not payouts/settings unless granted).

### 5. Customer Support Agent
- **Goals:** Resolve a customer issue in one screen — see order, payment, shipment, and history without hopping systems.
- **Pain points:** Fragmented tools; no unified timeline of what happened to an order.
- **Primary surfaces:** Support console (unified customer/order/payment/shipment view), ticketing, refund/return actions (scoped).

### 6. Operations Manager
- **Goals:** Keep fulfillment and logistics healthy across warehouses; catch stock-outs and delivery breakdowns before customers do.
- **Pain points:** No cross-seller, cross-warehouse visibility; reactive instead of proactive.
- **Primary surfaces:** Admin inventory/logistics dashboards, alerts, command center ("products below 5 stock").

### 7. Finance User
- **Goals:** Reconcile orders, payments, refunds, commissions, and payouts; ensure nothing is paid out incorrectly.
- **Pain points:** Manual reconciliation across payment provider, ledger, and seller statements.
- **Primary surfaces:** Admin financial reconciliation views, commission configuration, payout runs, audit exports.

### 8. Administrator (Platform Operator)
- **Goals:** Full operational control — approve sellers, monitor fraud, configure platform rules, view business intelligence.
- **Pain points:** Needs both real-time operational tools and long-horizon BI in one place.
- **Primary surfaces:** Admin platform in full — dashboard, all management modules, AI admin assistant, system configuration.

---

## C. Complete Feature Map

Organized by domain. This is the canonical feature inventory the roadmap (Part 4) is sequenced against.

### C.1 Discovery & Search
- Keyword search with autocomplete, typo tolerance, synonyms
- Natural-language query parsing (attributes, price, use-case)
- Visual search ("Find Similar")
- Faceted filtering (price, brand, rating, attributes, location, availability)
- Category & brand pages with curated merchandising
- AI shopping assistant (conversational, commerce-grounded)
- Personalized homepage sections (trending, picked-for-you, recently viewed, continue shopping)
- Curated collections (CMS-driven)
- Social commerce feed (short-form product content)

### C.2 Product Catalogue
- Product, variant, SKU model with structured attributes per category
- Multi-image/video gallery, zoom, lifestyle & customer imagery
- Structured specifications, comparison support
- Bulk CSV/Excel import with validation & preview
- Frequently-bought-together / similar / related product logic

### C.3 Reviews & Trust
- Structured reviews (rating, verified-purchase badge, photos/videos, helpful votes)
- Rating distribution & category-specific insight extraction ("Customers say: comfortable, durable")
- Q&A on product pages
- Seller verification badges, seller ratings, seller quality score
- Product authenticity signals, counterfeit reporting

### C.4 Cart & Checkout
- Persistent, cross-device cart for authenticated users; session cart for guests
- Real-time price/stock/promotion recalculation
- Free-delivery threshold nudges, contextual cross-sell
- Guest & authenticated checkout, saved addresses, multiple delivery methods
- Promo code application, order review
- M-Pesa STK Push, Paybill, Till; card payments; payment abstraction for future providers
- Idempotent payment operations; explicit payment status machine (pending/success/failed/cancelled/timeout/retry)

### C.5 Orders & Fulfillment
- Explicit order state machine (pending → delivered, plus cancelled/failed/returned/refunded/disputed)
- Seller order queue (accept, pack, hand to courier)
- Multi-warehouse, location-aware inventory reservation (no overselling)
- Delivery zone/method/fee configuration; pickup points; store pickup
- Courier integration abstraction; shipment tracking; live order-tracking UI

### C.6 Post-Purchase
- Returns workflow (request → reason → evidence → review → pickup → inspection → refund)
- Disputes workflow with audit trail
- Refunds (full/partial), refund-to-original-method logic
- Notifications across order lifecycle (email/SMS/push/in-app/WhatsApp)

### C.7 Marketplace / Seller Platform
- Seller registration, identity verification, document upload, approval workflow
- Seller storefront (branding, policies, followers, collections)
- Seller dashboard: sales, orders, inventory, promotions, analytics, reviews, payouts
- Seller staff accounts with RBAC
- Commission engine (category/seller/product, fixed+percentage, promotional overrides)
- Seller payouts: schedules, statuses, settlement records, reconciliation, statements
- Seller quality score (rating, fulfillment speed, cancellation/return rate, complaints, response time)

### C.8 Personalization & Recommendations
- Signal capture: browsing, search, cart, wishlist, purchase, location, seasonality
- Rule-based recommendations at launch (frequently-bought-together, same-category, same-brand, similar-price, browsing history)
- Architecture for evolution to collaborative filtering / embeddings / ranking models
- Wishlist (multiple lists, private/public, price-drop & back-in-stock alerts, sharing)

### C.9 Promotions & Growth
- Configurable promotion engine (percentage/fixed/BOGO/category/brand/seller/first-order/min-basket/free-shipping/flash-sale/coupon/referral/loyalty)
- Eligibility rules, usage limits, date windows, scope
- Referral program architecture

### C.10 Notifications & Messaging
- Multi-channel notification infrastructure (email, SMS, push, in-app, WhatsApp)
- User-controlled preferences per channel/event
- Seller↔buyer messaging; support conversations

### C.11 Admin & Operations
- Full CRUD admin for products, categories, brands, sellers, customers, orders, payments, promotions
- Fraud monitoring (velocity, payment anomalies, account takeover, coupon/refund abuse, risk scoring, review queue)
- Financial reconciliation across orders/payments/refunds/commissions/payouts
- Command-center search ("failed M-Pesa payments today")
- AI admin assistant grounded in real analytics data
- CMS for homepage sections, banners, campaigns, blog/content
- System configuration (commission rules, delivery zones, tax rules, feature flags)

### C.12 Platform-Wide Concerns
- Authentication (email/phone/OTP/OAuth/passkeys/MFA), RBAC
- i18n (English/Swahili at launch), l10n (KES, +254, Kenyan counties)
- SEO (semantic HTML, structured data, sitemap, clean URLs)
- PWA (installable, offline shell, push)
- Observability (logging, metrics, tracing, health checks)
- Fraud/security controls, audit logging, encryption, secret management

---

## D. Information Architecture

### D.1 Public / Buyer Routes

```
/                                   Homepage (dynamic, personalized)
/shop                               All-products browse (filterable)
/category/:categorySlug             Category listing
/category/:categorySlug/:subSlug    Subcategory listing
/brand/:brandSlug                   Brand page
/product/:productSlug               Product detail page
/collections/:collectionSlug        Curated collection (CMS-driven)
/search?q=...                       Search results
/search/visual                      Visual search upload/result flow
/deals                              Flash deals / active promotions
/new                                New arrivals
/seller/:sellerSlug                 Seller storefront
/seller/:sellerSlug/reviews         Seller reviews
/wishlist                           Wishlist(s)
/wishlist/:listId/share             Public shared wishlist view
/cart                               Cart
/checkout                           Checkout flow
/checkout/payment                   Payment step (M-Pesa/card)
/checkout/confirmation/:orderId     Order confirmation
/orders                             Order history (auth)
/orders/:orderId                    Order detail / tracking
/orders/:orderId/return             Return request flow
/account                            Account overview
/account/addresses                  Saved addresses
/account/payment-methods            Saved payment methods
/account/notifications              Notification preferences
/account/security                   Password/MFA/passkeys
/account/privacy                    Data export / deletion
/assistant                          AI shopping assistant (also embedded contextually)
/help                               Help center / support
/help/ticket/:ticketId              Support ticket thread
/login  /register  /otp  /forgot-password
```

### D.2 Seller Platform Routes (`/seller-portal/...` or subdomain `sell.uzanunua.com`)

```
/seller-portal/onboarding                 Registration & verification wizard
/seller-portal/dashboard                  Sales/orders/revenue overview
/seller-portal/products                   Product management (list)
/seller-portal/products/new               Create product
/seller-portal/products/:id/edit          Edit product
/seller-portal/products/import            Bulk CSV/Excel import
/seller-portal/inventory                  Stock across warehouses
/seller-portal/orders                     Order queue (accept/pack/ship)
/seller-portal/orders/:id                 Order detail
/seller-portal/returns                    Return requests
/seller-portal/promotions                 Seller-scoped promotions/coupons
/seller-portal/reviews                    Reviews & Q&A management
/seller-portal/messages                   Buyer conversations
/seller-portal/analytics                  Sales & product performance
/seller-portal/payouts                    Payout schedule/history/statements
/seller-portal/staff                      Staff accounts & roles
/seller-portal/settings                   Storefront branding, policies
```

### D.3 Admin Platform Routes (`/admin/...` or subdomain `admin.uzanunua.com`)

```
/admin/dashboard                    Revenue/orders/customers/sellers/BI overview
/admin/command                      Command-center search/AI assistant
/admin/products                     Product management
/admin/categories                   Category management
/admin/brands                       Brand management
/admin/sellers                      Seller management & approvals
/admin/customers                    Customer management
/admin/orders                       Order management
/admin/payments                     Payment management
/admin/refunds                      Refunds
/admin/promotions                   Promotions & coupons
/admin/commissions                  Commission configuration
/admin/inventory                    Cross-seller inventory
/admin/logistics                    Delivery zones, couriers, shipments
/admin/content                      CMS: homepage, banners, campaigns
/admin/reviews                      Review moderation
/admin/disputes                     Dispute resolution
/admin/fraud                        Fraud monitoring & risk queue
/admin/analytics                    Funnel, cohort, seller/product performance
/admin/settings                     Platform configuration, feature flags
/admin/audit-log                    Audit trail
```

### D.4 URL Conventions
- Product: `/product/apple-iphone-16-pro` (slug, not `?id=`)
- Category: `/category/electronics/laptops` (hierarchical)
- Brand: `/brand/apple`
- Seller: `/seller/mama-njeri-fashion`
- Collection: `/collections/back-to-school`
- All slugs are stable, lowercase, hyphenated, and independent of internal numeric/UUID IDs (which remain in the API layer only).

---

*Continued in Part 2 (UX Architecture), Part 3 (Technical Architecture), Part 4 (Database), Part 5 (API), Part 6 (Design System), Part 7 (Security & AI), Part 8 (Infrastructure, Roadmap, Risk Register).*
