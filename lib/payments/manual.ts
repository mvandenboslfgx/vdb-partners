import { requirePermission } from "@/lib/auth/require-auth";

export interface ManualPaymentConfirmation { orderId: string; bankReference: string; amount: number; confirmedAt: Date; confirmedBy: string; }
/** Call only from a server action/route after recording the immutable confirmation. */
export async function confirmManualBankPayment(input: Omit<ManualPaymentConfirmation, "confirmedAt" | "confirmedBy">): Promise<ManualPaymentConfirmation> {
  const admin = await requirePermission("confirm_payment");
  if (!input.bankReference.trim()) throw new Error("Bank reference is required");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error("Amount must be positive cents");
  return { ...input, bankReference: input.bankReference.trim(), confirmedAt: new Date(), confirmedBy: admin.id };
}
