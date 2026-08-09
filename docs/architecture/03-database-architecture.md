# UzaNunua — Blueprint Part 4
## G. Database Architecture

PostgreSQL, accessed via Prisma. Conventions: `id` = UUID primary key on every table; `createdAt`/`updatedAt` timestamps on every table; `deletedAt` (nullable) for soft-deletion on user-facing/business-critical entities (Product, Seller, User, Order — never hard-deleted); money stored as integer minor units (cents/lowest KES unit) to avoid float rounding errors; all foreign keys indexed; all tables that are queried by a status field have that field indexed (often composite with `sellerId`/`createdAt`).

This is the logical entity model. Exact Prisma schema is generated in Phase 1 implementation from this model.

---

### G.1 Identity & Access

**User** — id, email (unique, nullable if phone-only), phone (unique, nullable), passwordHash (nullable for passwordless), emailVerifiedAt, phoneVerifiedAt, status (active/suspended/banned), lastLoginAt, mfaEnabled, createdAt, updatedAt, deletedAt.

**Role** — id, name (buyer, seller_owner, seller_staff, support_agent, ops_manager, finance, admin, superadmin), description.

**Permission** — id, key (e.g., `orders:refund`, `products:write`), description.

**RolePermission** — roleId, permissionId (join table).

**UserRole** — userId, roleId, sellerId (nullable — scopes seller-staff roles to a specific seller).

**Session** — id, userId, refreshTokenHash, userAgent, ip, expiresAt, revokedAt.

**Address** — id, userId (nullable if order-only guest address), label, recipientName, phone, line1, line2, city, county, postalCode, country (default KE), latitude, longitude, isDefault.

---

### G.2 Sellers

**Seller** — id, name, slug (unique), logoUrl, bannerUrl, description, status (pending/approved/suspended/rejected), verifiedAt, ratingAvg, ratingCount, followerCount, qualityScore, commissionOverridePct (nullable), payoutMethod, payoutDetailsEncrypted, createdAt.

**SellerUser** — sellerId, userId, role (owner/staff), invitedAt, acceptedAt.

**SellerVerification** — id, sellerId, documentType (national_id/business_reg/kra_pin/bank_confirmation), documentUrl, status (pending/approved/rejected), reviewedByUserId, reviewedAt, rejectionReason.

**SellerPolicy** — sellerId, returnPolicy, shippingPolicy, warrantyPolicy.

---

### G.3 Catalogue

**Category** — id, name, slug (unique), parentId (nullable, self-relation for hierarchy), imageUrl, sortOrder, isActive.

**Brand** — id, name, slug (unique), logoUrl, isVerified.

**Product** — id, sellerId, categoryId, brandId (nullable), name, slug (unique), description, status (draft/active/inactive/rejected), basePrice, compareAtPrice (nullable, for strikethrough), currency (default KES), avgRating, reviewCount, viewCount, isFeatured, createdAt, updatedAt, deletedAt.

**ProductAttribute** — id, productId, key (e.g., "RAM", "Color"), value, unit (nullable). Category-specific structured attributes (Section 57) — validated against a **CategoryAttributeSchema** (see below) at write time.

**CategoryAttributeSchema** — id, categoryId, attributeKey, attributeType (text/number/enum/boolean), required (bool), options (json, for enum type). Drives dynamic product-creation forms and structured filtering.

**ProductVariant** — id, productId, sku (unique), attributesJson (e.g., {"color":"black","size":"42"}), price, compareAtPrice, imageId (nullable override), isActive.

**ProductImage** — id, productId, variantId (nullable), url, altText, sortOrder, isPrimary.

**ProductVideo** — id, productId, url, thumbnailUrl, sortOrder.

**ProductTag** — id, productId, tag (used for merchandising/collections beyond category, e.g., "eco-friendly").

---

### G.4 Inventory

**Warehouse** — id, sellerId (nullable — platform-owned warehouses allowed), name, county, city, address, latitude, longitude, isActive.

**Inventory** — id, variantId, warehouseId, stockQty, reservedQty, availableQty (generated: stockQty - reservedQty), lowStockThreshold. Unique constraint (variantId, warehouseId).

**StockMovement** — id, inventoryId, type (received/sold/reserved/released/adjusted/returned/damaged), quantity, reason, referenceType (order/return/manual), referenceId, performedByUserId, createdAt. Append-only, immutable audit trail of every stock change.

---

### G.5 Cart & Wishlist

**Cart** — id, userId (nullable for guest), guestToken (nullable), status (active/converted/abandoned), currency, createdAt, updatedAt.

**CartItem** — id, cartId, variantId, sellerId (denormalized for per-seller grouping), quantity, priceSnapshot (price at add-time, revalidated at checkout), savedForLater (bool).

**Wishlist** — id, userId, name (default "My Wishlist"), isPublic, shareToken.

**WishlistItem** — id, wishlistId, variantId, addedAt, notifyOnPriceDrop, notifyOnBackInStock.

---

### G.6 Orders & Payments

**Order** — id, orderNumber (human-readable, e.g., UZ123456), userId (nullable for guest), guestEmail/guestPhone, status (see state machine, Part 3 mirrors Section 17), subtotal, discountTotal, deliveryFee, taxTotal, total, currency, deliveryAddressId, placedAt, confirmedAt, cancelledAt.

**OrderSeller** — id, orderId, sellerId, subtotal, deliveryFee, status (mirrors overall but seller-scoped: a multi-seller order has independent per-seller fulfillment states). This is the key entity enabling a single checkout to fan out into independent seller fulfillment flows.

**OrderItem** — id, orderSellerId, variantId, productNameSnapshot, variantAttributesSnapshot, unitPrice, quantity, lineTotal, commissionAmount, sellerEarning.

**Payment** — id, orderId, provider (mpesa_stk/mpesa_paybill/mpesa_till/stripe_card/...), providerReference, idempotencyKey (unique), amount, currency, status (pending/processing/succeeded/failed/cancelled/timeout), initiatedAt, confirmedAt, rawProviderPayloadJson (for audit/debug), failureReason.

**Refund** — id, paymentId, orderId, amount, reason, status (pending/processing/succeeded/failed), initiatedByUserId, providerReference, createdAt, completedAt.

---

### G.7 Fulfillment

**Shipment** — id, orderSellerId, courierProvider, trackingNumber, status (label_created/in_transit/out_for_delivery/delivered/failed/returned), originWarehouseId, estimatedDeliveryAt, deliveredAt.

**ShipmentEvent** — id, shipmentId, status, location, note, occurredAt. Append-only tracking history feeding the buyer-facing tracker.

**Return** — id, orderItemId, userId, reason, status (requested/under_review/approved/rejected/picked_up/inspecting/refunded), evidenceUrls (json array), requestedAt, resolvedAt.

**Dispute** — id, orderId, raisedByUserId, category, status (open/under_review/seller_response/customer_response/resolved/rejected/refunded), assignedToUserId (support agent), createdAt, resolvedAt.

**DisputeMessage** — id, disputeId, authorUserId, body, attachmentUrls, createdAt.

---

### G.8 Promotions & Commissions

**Promotion** — id, name, type (percentage/fixed/bogo/category/brand/seller/first_order/min_basket/free_shipping/flash_sale/referral/loyalty), scopeType (platform/seller/category/product), scopeId (nullable), valuePct (nullable), valueFixed (nullable), minBasketValue (nullable), startAt, endAt, usageLimitTotal, usageLimitPerCustomer, isActive.

**Coupon** — id, promotionId, code (unique), timesUsed.

**PromotionRedemption** — id, promotionId, orderId, userId, discountAmount, redeemedAt.

**Commission** — id, sellerId (nullable = platform default), categoryId (nullable), productId (nullable), type (percentage/fixed/hybrid), valuePct, valueFixed, effectiveFrom, effectiveTo.

**CommissionLedgerEntry** — id, orderItemId, grossAmount, platformFee, paymentProcessingFee, sellerEarning, createdAt. Immutable — the authoritative record reconciliation (Section 54) is built from.

**SellerPayout** — id, sellerId, periodStart, periodEnd, grossSales, totalCommission, totalRefunds, netPayoutAmount, status (scheduled/processing/paid/failed), providerReference, scheduledAt, paidAt.

---

### G.9 Reviews & Social

**Review** — id, productId, orderItemId (nullable — enables verified-purchase badge), userId, rating (1–5), title, body, isVerifiedPurchase, helpfulCount, status (published/flagged/removed), createdAt.

**ReviewMedia** — id, reviewId, type (image/video), url.

**ReviewInsight** — id, productId, dimension (comfort/quality/value/durability/fit/performance — category-dependent), sentimentScore, mentionCount. Aggregated periodically from review text to power "Customers say..." (Section 14) — never fabricated per-review, always derived from actual review content.

**Question / Answer** — id, productId, userId, body, answeredBySellerId (nullable), createdAt.

**SocialPost** — id, sellerId (nullable), userId (nullable, for UGC), type (video/story/image), mediaUrl, caption, linkedProductIds (json array), createdAt.

---

### G.10 Personalization & Search Telemetry

**Recommendation** — id, userId (nullable), productId, sourceProductId (nullable, for "similar to X"), type (fbt/similar/trending/personalized), score, generatedAt. Rule-based at launch; the schema is generic enough to host model-scored rows later without migration.

**SearchEvent** — id, userId (nullable), sessionId, rawQuery, parsedFiltersJson, resultCount, clickedProductId (nullable), createdAt.

**ProductView** — id, userId (nullable), sessionId, productId, source (search/recommendation/category/direct), viewedAt.

---

### G.11 Notifications & Support

**Notification** — id, userId, channel (email/sms/push/in_app/whatsapp), event (order_confirmed/payment_confirmed/shipped/delivered/refunded/price_drop/back_in_stock/promotion/seller_message), payloadJson, status (queued/sent/delivered/failed), sentAt.

**NotificationPreference** — userId, event, channel, enabled.

**Conversation** — id, type (buyer_seller/support), subjectUserId, sellerId (nullable), status (open/closed).

**Message** — id, conversationId, authorUserId, body, attachmentUrls, createdAt.

**Ticket** — id, conversationId, orderId (nullable), assignedAgentId, priority, status (open/pending/resolved/closed), createdAt, resolvedAt.

---

### G.12 Platform Integrity

**AuditLog** — id, actorUserId (nullable, for system actions), action, entityType, entityId, beforeJson, afterJson, ip, createdAt. Written for every admin/financial/security-relevant mutation — immutable.

**FraudRisk** — id, entityType (order/user/seller), entityId, riskScore, signalsJson, status (flagged/reviewing/cleared/confirmed_fraud), reviewedByUserId, createdAt.

**FeatureFlag** — id, key, description, isEnabled, rolloutPct, scopeJson (nullable, for targeted rollout).

---

### G.13 Relationships Summary (high-cardinality edges)

- Seller 1—N Product; Product 1—N ProductVariant; ProductVariant 1—N Inventory (per warehouse)
- User 1—N Order; Order 1—N OrderSeller (fan-out per seller); OrderSeller 1—N OrderItem; OrderSeller 1—0/1 Shipment
- Order 1—N Payment (supports retries); Payment 1—0/N Refund
- Product 1—N Review; Review 1—N ReviewMedia
- Promotion 1—N Coupon; Promotion 1—N PromotionRedemption
- Seller 1—N SellerPayout; OrderItem 1—1 CommissionLedgerEntry

### G.14 Indexing & Constraints Strategy

- Composite index `(sellerId, status, createdAt)` on Order/OrderSeller for seller dashboards.
- Composite index `(productId, status)` on Review; `(variantId, warehouseId)` unique on Inventory.
- Unique constraints: `User.email`, `User.phone`, `Product.slug`, `Category.slug`, `Brand.slug`, `Seller.slug`, `Coupon.code`, `Payment.idempotencyKey`.
- Foreign keys `ON DELETE RESTRICT` for financial entities (Payment, OrderItem, CommissionLedgerEntry) — never cascade-delete money records; soft-delete parents instead.
- All monetary columns: `bigint` (minor units), never `float`/`double`.
- Transactions wrap: order placement (Order + OrderSeller + OrderItem + inventory reservation), payment confirmation (Payment + Order status + StockMovement + CommissionLedgerEntry), and payout runs — these are the points where partial writes would corrupt financial or inventory integrity.
