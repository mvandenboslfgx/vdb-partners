export const orderStatuses = [
  "draft",
  "submitted",
  "under_review",
  "payment_link_pending",
  "awaiting_payment",
  "payment_received",
  "payment_verified",
  "fulfilment_pending",
  "in_fulfilment",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
  "disputed",
  "fraud_review",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["under_review", "cancelled"],
  under_review: ["payment_link_pending", "awaiting_payment", "cancelled", "fraud_review"],
  payment_link_pending: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["payment_received", "cancelled", "fraud_review"],
  payment_received: ["payment_verified", "disputed", "fraud_review", "refunded"],
  payment_verified: ["fulfilment_pending", "refunded", "disputed"],
  fulfilment_pending: ["in_fulfilment", "cancelled"],
  in_fulfilment: ["delivered", "disputed"],
  delivered: ["completed", "disputed", "refunded"],
  completed: ["refunded", "disputed"],
  cancelled: [],
  refunded: [],
  disputed: ["under_review", "refunded", "completed", "cancelled"],
  fraud_review: ["under_review", "cancelled", "disputed"],
};
export const canTransition = (from: OrderStatus, to: OrderStatus) => transitions[from].includes(to);
export function assertTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransition(from, to)) throw new Error(`Invalid order transition: ${from} → ${to}`);
}
export { transitions };
