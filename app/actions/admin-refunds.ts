"use server";

import { requirePermission } from "@/lib/auth/require-auth";
import { processRefundAfterPayout } from "@/lib/workflows/finance";

export async function processRefundAfterPayoutAction(input: {
  orderId: string;
  paymentId: string;
  amountCents: number;
  reason: string;
}) {
  const actor = await requirePermission("confirm_payment");
  return processRefundAfterPayout(actor.id, input);
}
