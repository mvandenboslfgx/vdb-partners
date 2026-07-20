import { maskIban } from "@/lib/security/masking";
import type { PayoutBatch } from "@/lib/payouts/types";

export interface BankPayoutRegistration { batchId: string; iban: string; accountHolder: string; transferReference: string; registeredAt: Date; }
export function registerBankPayout(batch: PayoutBatch, input: Omit<BankPayoutRegistration, "batchId" | "registeredAt">): BankPayoutRegistration {
  if (batch.method !== "bank" || batch.status !== "draft") throw new Error("Only draft bank batches can be registered");
  if (!input.accountHolder.trim() || !input.transferReference.trim()) throw new Error("Account holder and transfer reference are required");
  return { batchId: batch.id, ...input, iban: input.iban.replace(/\s/g, "").toUpperCase(), registeredAt: new Date() };
}
export const bankPayoutSummary = (payout: BankPayoutRegistration) => ({ ...payout, iban: maskIban(payout.iban) });
