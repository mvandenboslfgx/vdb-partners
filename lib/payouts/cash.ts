import type { PayoutBatch } from "@/lib/payouts/types";

export interface CashPayout { batchId: string; recipientName: string; receiptNumber: string; status: "prepared" | "awaiting_confirmation" | "confirmed_received"; }
export function prepareCashPayout(batch: PayoutBatch, recipientName: string, receiptNumber: string): CashPayout {
  if (batch.method !== "cash" || batch.status !== "draft") throw new Error("Only draft cash batches can be prepared");
  if (!recipientName.trim() || !receiptNumber.trim()) throw new Error("Recipient and receipt number are required");
  return { batchId: batch.id, recipientName: recipientName.trim(), receiptNumber: receiptNumber.trim(), status: "prepared" };
}
export function requestCashConfirmation(payout: CashPayout): CashPayout {
  if (payout.status !== "prepared") throw new Error("Cash payout is not ready for confirmation");
  return { ...payout, status: "awaiting_confirmation" };
}
export function confirmCashReceived(payout: CashPayout, recipientName: string): CashPayout {
  if (payout.status !== "awaiting_confirmation" || payout.recipientName !== recipientName.trim()) throw new Error("Cash receipt confirmation is invalid");
  return { ...payout, status: "confirmed_received" };
}
