# UzaNunua — Blueprint Part 5
## H. API Architecture

### H.1 Conventions

- REST over HTTPS, JSON bodies, versioned via path prefix `/api/v1`.
- Every endpoint documented in OpenAPI/Swagger, generated from NestJS decorators — this spec is what generates the frontend's typed API client (Section F.3), so drift between backend and frontend types is structurally prevented.
- Auth: `Authorization: Bearer <JWT>` (access token, short-lived) + httpOnly refresh-token cookie rotation. Seller and Admin endpoints additionally enforce RBAC guards checking `UserRole`/`Permission`.
- Pagination: cursor-based (`?cursor=...&limit=...`) for high-cardinality lists (products, orders, reviews); offset-based only for small admin config lists.
- Errors: consistent shape `{ "error": { "code": "INSUFFICIENT_STOCK", "message": "...", "details": {...} } }`, mapped from domain exceptions by a global filter — never a raw stack trace.
- Idempotency: header `Idempotency-Key` required on `POST /checkout`, `POST /payments/*/initiate`, `POST /orders/:id/cancel`.
- Rate limiting: per-IP and per-user limits on auth, OTP, checkout-initiation, and search endpoints via Redis.

### H.2 Auth & Identity

```
POST   /auth/register
POST   /auth/login
POST   /auth/otp/request
POST   /auth/otp/verify
POST   /auth/oauth/:provider/callback
POST   /auth/passkey/register
POST   /auth/passkey/authenticate
POST   /auth/refresh
POST   /auth/logout
POST   /auth/mfa/enable
POST   /auth/mfa/verify
GET    /me
PATCH  /me
GET    /me/addresses
POST   /me/addresses
PATCH  /me/addresses/:id
DELETE /me/addresses/:id
```

### H.3 Catalogue

```
GET    /categories
GET    /categories/:slug
GET    /brands
GET    /brands/:slug
GET    /products                     (filterable: category, brand, price range, rating, seller, attributes)
GET    /products/:slug
POST   /products                     (seller/admin)
PATCH  /products/:id                 (seller/admin, ownership-checked)
DELETE /products/:id                 (soft delete)
POST   /products/import              (bulk CSV/Excel — returns a job id)
GET    /products/import/:jobId       (import status/report)
GET    /products/:id/related
GET    /products/:id/frequently-bought-together
```

### H.4 Search

```
GET    /search?q=...&filters=...&sort=...
GET    /search/autocomplete?q=...
POST   /search/visual                (multipart image upload)
POST   /ai/shopping-assistant        (conversational, session-based)
```

### H.5 Cart

```
GET    /cart
POST   /cart/items
PATCH  /cart/items/:id
DELETE /cart/items/:id
POST   /cart/items/:id/save-for-later
POST   /cart/merge                   (guest cart → account cart on login)
POST   /cart/promo-code
DELETE /cart/promo-code
```

### H.6 Checkout & Payments

```
POST   /checkout                     (Idempotency-Key required; validates stock/price server-side, creates Order in "pending" state)
GET    /checkout/:sessionId
POST   /payments/mpesa/stk/initiate  (Idempotency-Key required)
GET    /payments/:id/status
POST   /payments/mpesa/webhook       (provider callback, signature-verified)
POST   /payments/stripe/webhook
POST   /payments/:id/retry
```

### H.7 Orders

```
GET    /orders
GET    /orders/:id
POST   /orders/:id/cancel
GET    /orders/:id/tracking
POST   /orders/:id/items/:itemId/return
GET    /returns/:id
```

### H.8 Wishlist & Reviews

```
GET    /wishlists
POST   /wishlists
POST   /wishlists/:id/items
DELETE /wishlists/:id/items/:itemId
GET    /wishlists/:id/share

GET    /products/:id/reviews
POST   /products/:id/reviews          (order-verified)
POST   /reviews/:id/helpful
GET    /products/:id/questions
POST   /products/:id/questions
POST   /questions/:id/answers         (seller)
```

### H.9 Seller Platform

```
POST   /seller/register
POST   /seller/verification/documents
GET    /seller/dashboard
GET    /seller/orders
PATCH  /seller/orders/:id/accept
PATCH  /seller/orders/:id/pack
PATCH  /seller/orders/:id/ship
GET    /seller/products
GET    /seller/inventory
PATCH  /seller/inventory/:variantId
GET    /seller/promotions
POST   /seller/promotions
GET    /seller/analytics
GET    /seller/payouts
GET    /seller/payouts/:id/statement
GET    /seller/staff
POST   /seller/staff/invite
```

### H.10 Admin

```
GET    /admin/dashboard
GET    /admin/command?q=...           (natural-language operational search)
GET    /admin/sellers
PATCH  /admin/sellers/:id/approve
PATCH  /admin/sellers/:id/suspend
GET    /admin/orders
GET    /admin/payments
POST   /admin/refunds
GET    /admin/promotions
POST   /admin/commissions
GET    /admin/inventory/alerts
GET    /admin/disputes
PATCH  /admin/disputes/:id/resolve
GET    /admin/fraud/queue
PATCH  /admin/fraud/:id/review
GET    /admin/analytics/funnel
GET    /admin/analytics/cohorts
POST   /admin/ai-assistant/query      (grounded analytics Q&A)
GET    /admin/audit-log
GET    /admin/content/sections
PATCH  /admin/content/sections/:id
```

### H.11 Real-Time Channels (WebSocket/SSE)

```
/ws/payments/:paymentId       payment status stream (pending → succeeded/failed)
/ws/orders/:orderId           order status stream (buyer + seller views)
/ws/seller/orders             seller order-queue live feed
/ws/admin/dashboard           live admin metrics feed
```

### H.12 Notifications

```
GET    /me/notification-preferences
PATCH  /me/notification-preferences
GET    /me/notifications
PATCH  /me/notifications/:id/read
```

### H.13 Cross-Cutting: AI Endpoints Contract

`POST /ai/shopping-assistant` and `POST /admin/ai-assistant/query` never return free-form fabricated commerce facts. Internally, both are implemented as a tool-calling agent over a fixed toolset (`searchProducts`, `getProduct`, `getOrder`, `getInventory`, `getAnalyticsMetric`, etc.) backed by the same services the REST API uses — the LLM composes and explains, it does not originate factual claims about price/stock/orders/analytics (elaborated in Part 7, Section K).
