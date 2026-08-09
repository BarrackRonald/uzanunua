/**
 * @uzanunua/domain-types
 *
 * Single source of truth for enums and cross-cutting types shared between
 * apps/web and apps/api, so state machines can never drift between the
 * frontend and backend. These mirror the entities defined in
 * docs/architecture/03-database-architecture.md.
 */

// ── Order lifecycle (Section 17 of the master brief) ─────────────────────
export const OrderStatus = {
  PENDING: "pending",
  PAYMENT_PROCESSING: "payment_processing",
  PAID: "paid",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  PACKED: "packed",
  SHIPPED: "shipped",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  FAILED: "failed",
  RETURNED: "returned",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
  DISPUTED: "disputed",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** Valid forward transitions. Used by the Orders domain service to reject illegal state changes. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAYMENT_PROCESSING, OrderStatus.CANCELLED, OrderStatus.FAILED],
  [OrderStatus.PAYMENT_PROCESSING]: [OrderStatus.PAID, OrderStatus.FAILED, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.DISPUTED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED, OrderStatus.DISPUTED],
  [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
  [OrderStatus.FAILED]: [],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.PARTIALLY_REFUNDED]: [OrderStatus.REFUNDED],
  // A dispute resolves back into the order's prior lifecycle: either the
  // order stands (returns to CONFIRMED/DELIVERED handled by the Disputes
  // module directly, not via this table) or it resolves into a refund.
  [OrderStatus.DISPUTED]: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
};

// ── Payment lifecycle (Section 16) ────────────────────────────────────────
export const PaymentStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
  TIMEOUT: "timeout",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentProvider = {
  MPESA_STK: "mpesa_stk",
  MPESA_PAYBILL: "mpesa_paybill",
  MPESA_TILL: "mpesa_till",
  STRIPE_CARD: "stripe_card",
} as const;
export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

// ── Shipment lifecycle (Section 22) ───────────────────────────────────────
export const ShipmentStatus = {
  LABEL_CREATED: "label_created",
  IN_TRANSIT: "in_transit",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  FAILED: "failed",
  RETURNED: "returned",
} as const;
export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

// ── Return lifecycle (Section 62) ─────────────────────────────────────────
export const ReturnStatus = {
  REQUESTED: "requested",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  PICKED_UP: "picked_up",
  INSPECTING: "inspecting",
  REFUNDED: "refunded",
} as const;
export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];

// ── Dispute lifecycle (Section 63) ────────────────────────────────────────
export const DisputeStatus = {
  OPEN: "open",
  UNDER_REVIEW: "under_review",
  SELLER_RESPONSE: "seller_response",
  CUSTOMER_RESPONSE: "customer_response",
  RESOLVED: "resolved",
  REJECTED: "rejected",
  REFUNDED: "refunded",
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

// ── Seller lifecycle ───────────────────────────────────────────────────────
export const SellerStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  SUSPENDED: "suspended",
  REJECTED: "rejected",
} as const;
export type SellerStatus = (typeof SellerStatus)[keyof typeof SellerStatus];

// ── Roles (Part 4, G.1) ────────────────────────────────────────────────────
export const RoleName = {
  BUYER: "buyer",
  SELLER_OWNER: "seller_owner",
  SELLER_STAFF: "seller_staff",
  SUPPORT_AGENT: "support_agent",
  OPS_MANAGER: "ops_manager",
  FINANCE: "finance",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

// ── Money — always integer minor units (Section G, database architecture) ──
/** KES minor unit (cent). Never use floats for money anywhere in the codebase. */
export type MinorUnits = number;

export interface Money {
  amount: MinorUnits;
  currency: "KES" | "USD";
}

// ── Standard API error shape (Part 5, H.1) ─────────────────────────────────
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ── Standard paginated response envelope ────────────────────────────────────
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
