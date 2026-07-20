export type PayoutMethod = "bank_transfer" | "cash" | "bank";
export type PayoutStatus = "draft" | "prepared" | "awaiting_confirmation" | "confirmed_received" | "registered" | "paid" | "cancelled" | "reversed";
export interface CommissionForPayout { id: string; sellerId: string; amount: number; status: "available" | "reserved" | "paid" | "scheduled_for_payout"; }
export interface PayoutBatch { id: string; sellerId: string; method: PayoutMethod; commissionIds: string[]; amount: number; status: PayoutStatus; }
export const sumCommissionAmounts = (commissions: readonly Pick<CommissionForPayout, "amount">[]) => commissions.reduce((sum, item) => sum + item.amount, 0);
export function normalizePayoutMethod(method: PayoutMethod): "bank_transfer" | "cash" {
  return method === "bank" ? "bank_transfer" : method === "bank_transfer" ? "bank_transfer" : "cash";
}
