import { randomUUID } from "crypto";
import { sumCommissionAmounts, type CommissionForPayout, type PayoutBatch, type PayoutMethod } from "@/lib/payouts/types";

export function createPayoutBatch(sellerId: string, method: PayoutMethod, commissions: readonly CommissionForPayout[]): PayoutBatch {
  if (!sellerId || commissions.length === 0) throw new Error("Seller and at least one commission are required");
  if (commissions.some((item) => item.sellerId !== sellerId || item.status !== "available")) throw new Error("Only this seller's available commissions can be batched");
  const ids = commissions.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("A commission may only appear once in a batch");
  return { id: randomUUID(), sellerId, method, commissionIds: ids, amount: sumCommissionAmounts(commissions), status: "draft" };
}
/** Enforce this invariant in SQL too: unique active commission assignment / transaction lock. */
export const assertNoActiveCommissionOverlap = (newIds: readonly string[], activeIds: readonly string[]) => {
  if (newIds.some((id) => activeIds.includes(id))) throw new Error("Commission is already attached to an active payout batch");
};
