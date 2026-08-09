# UzaNunua — Blueprint Part 2
## E. UX Architecture

This section defines how users move through the platform end to end, and the state/UI contract at each step. Every step names: entry points, primary actions, system feedback, and failure handling — per the "What happened / what next / what does this cost / when will I get it / is it available / can I return it / can I trust the seller" standard (Section 84 of the brief).

---

### E.1 Discovery

**Entry points:** homepage sections, mega-nav, direct search, shared links, notifications (price drop, back-in-stock, promo), social commerce feed.

**Flow:**
1. Homepage renders a *personalized* section stack (Section F below). Anonymous users see a generic-but-good default stack (trending, new arrivals, curated collections); authenticated users with history see "Picked for You," "Continue Shopping," "Recently Viewed" inserted.
2. Category/brand navigation via mega-menu (desktop) or app-like drill-down nav (mobile).
3. Search bar is present on every screen (sticky on mobile). Typing triggers autocomplete after 2 characters (debounced), showing: matching products (thumbnail + price), matching categories, matching brands, matching sellers.
4. Search submission goes to `/search?q=...` with parsed intent (see E.2) reflected as removable filter chips, so the user can see and correct what the system inferred (e.g., "black ×", "running shoes ×", "under KSh 10,000 ×").
5. Visual search: camera/upload icon in search bar → `/search/visual` → user provides image → results ranked by visual similarity, same filter/sort chrome as text search.

**System feedback:** skeleton loaders for product grids (never blank/spinner-only); "0 results" state offers relaxed filters and related categories, never a dead end.

### E.2 Search & AI-Assisted Query Understanding

- Query parser extracts: category, brand, color/attributes, price ceiling/floor, use-case keywords (e.g., "for programming," "for running").
- Parsed intent is shown transparently as editable chips — the user is always in control of what's being filtered, never surprised by silent interpretation.
- If confidence is low on a parsed attribute, it's applied as a soft filter (boosts ranking) rather than a hard filter (excludes results), to avoid false "0 results."
- Natural-language queries can be escalated into the **AI Shopping Assistant** ("Ask AI to help me choose" CTA appears when a query looks comparison-heavy, e.g., "laptop for programming under 100k with good battery").

### E.3 Product Evaluation

**Entry:** product card click (grid, search, recommendation, social content, notification).

**Product Page flow:**
1. Gallery loads progressively (blurred placeholder → first image → rest lazy-loaded); variant selection swaps gallery images with a 150–250ms crossfade.
2. Immediately visible above the fold: name, seller (with verified badge + rating), price (+ strikethrough previous price + discount %), availability line ("In stock" / "Only 3 left" / "Available in Nairobi"), delivery estimate, primary CTA (Add to Cart) and secondary CTA (Buy Now / Wishlist).
3. Variant selection (color/size/etc.) updates price, images, availability, and SKU in place — no page reload.
4. Below the fold, progressive disclosure: benefits → specifications → reviews (with rating distribution + "Customers say" extracted insights) → Q&A → seller info card → frequently bought together → similar/related → recently viewed.
5. "Add to Cart" gives optimistic UI feedback (cart icon count animates, mini-cart drawer slides in) while the server call confirms in the background; on failure (e.g., stock changed), the drawer shows a corrective message rather than silently succeeding.
6. Out-of-stock state disables purchase actions and offers "Notify me when back in stock" instead of a dead button.

**Trust surfacing is not optional decoration** — verified-seller badge, return policy summary, and delivery estimate must always render even under partial data-service failure (Section E.8).

### E.4 Cart

**Entry:** header cart icon, mini-cart drawer (after add-to-cart), `/cart`.

- Cart is grouped by seller (since delivery/fulfillment is per-seller), with per-seller subtotal and delivery estimate.
- Line items show variant, quantity stepper, unit + line price, "Save for later" and "Move to wishlist" actions, and a remove action with an undo toast (not silent deletion).
- Free-delivery nudge: "You're KSh 350 away from free delivery" with a progress bar, computed per applicable seller/threshold.
- Contextual recommendations ("Frequently bought with items in your cart") below the line items, never above them.
- Price/stock is revalidated against the server on cart view and before checkout is allowed to proceed — client-cached prices are never trusted for the actual transaction (Section 32 of the brief: never trust client-side prices).
- Authenticated users: cart persists server-side and syncs across devices. Guests: cart persists in a signed session/cookie, and is merged into the account cart on login (with clear conflict handling — e.g., "we combined items from your other device").

### E.5 Checkout

**Design goal:** minimum steps, single scrolling flow rather than a multi-page wizard where avoidable, on both desktop and mobile.

1. **Delivery:** guest email/phone entry, or saved-address picker for authenticated users, plus "add new address" inline (no full-page redirect). Delivery method selection (courier / pickup point / store pickup) shows fee and ETA per option immediately.
2. **Payment:** M-Pesa is the default, first-listed option for Kenyan buyers. Card and other methods follow. Selecting M-Pesa reveals a phone number field (pre-filled from account if available) and a single "Send STK Push" action.
3. **Order review:** full price breakdown (subtotal, delivery, discounts, total) visible before the final confirm action — never revealed only after payment.
4. **Promo code** entry is inline and non-blocking (collapsed by default, expandable).

### E.6 Payment (M-Pesa-first)

This is the single highest-risk UX moment in the platform and is treated accordingly.

1. User taps "Send STK Push" → button enters a loading state → backend initiates STK push (idempotent, keyed by checkout session) → UI immediately shows: **"Check your phone to approve the M-Pesa payment."**
2. A live status view polls/subscribes (WebSocket/SSE) for payment state, showing an explicit sequence: *Waiting for approval → Confirming payment → Payment successful*, or a clear failure branch: *Payment failed / Payment cancelled / Request timed out*, each with a **Retry** action that re-initiates a fresh, idempotent attempt (never a silent double-charge risk).
3. The order is only created/confirmed after an **authoritative** payment-provider callback/confirmation is received server-side — the UI never marks an order "Paid" from client-side optimism.
4. If the user navigates away mid-payment, returning to the order shows the true current state (not a stale "processing" forever) — the client always re-fetches authoritative status on mount.
5. Card payments follow the equivalent pattern: explicit pending/success/failure states, no assumed success.

### E.7 Post-Payment: Confirmation, Tracking, Delivery

1. **Confirmation page** (`/checkout/confirmation/:orderId`): order number, itemized summary, delivery estimate, and immediate next actions (track order, continue shopping) — plus confirmation sent via the user's preferred notification channel(s).
2. **Order tracking** (`/orders/:orderId`): explicit vertical stepper mirroring the state machine (Order confirmed → Payment received → Seller processing → Packed → Out for delivery → Delivered), each with a timestamp once reached; current step visually distinct (filled dot) from future steps (hollow) per the brief's example.
3. Real-time updates push to the order page and to notifications without requiring a manual refresh.
4. Delivery step shows courier, live location/ETA where available, and a support contact.

### E.8 Post-Purchase & Resilience in the Journey

- **Reviews:** prompted post-delivery via notification, deep-linking straight into a review composer for the specific order/product.
- **Returns:** initiated from the order detail page, following the Section 62 workflow (reason → evidence upload → review → pickup/drop-off → inspection → refund), with status visible at every stage.
- **Disputes:** escalation path from a return/refund that isn't resolved to the buyer's satisfaction, routed to support with full order context attached automatically (agent never asks the customer to repeat information already in the system).
- **Graceful degradation is a first-class UX requirement, not a backend afterthought:** if AI/recommendations/analytics services are down, the corresponding UI sections collapse cleanly (e.g., "Recommendations unavailable right now" or the section simply omits itself) while search, product pages, cart, and checkout remain fully functional. Users are never blocked from buying because a non-critical subsystem failed.

### E.9 Cross-Cutting UX Rules
- Every async action (add to cart, apply promo, submit review, initiate payment) has explicit loading, success, empty, and error states with human microcopy (Section 65/66/67 of the brief) — no bare spinners, no silent failures, no raw stack traces surfaced to users.
- Optimistic UI is used only where the failure mode is cheap to reverse (cart add, wishlist toggle); it is never used for payment or inventory-committing actions.
- Modals are reserved for genuinely interrupting decisions (confirm cancel order); routine flows use drawers/bottom sheets/inline expansion instead (Section 85).
