"use server";

import { requireRole } from "@/lib/auth/require-auth";
import {
  advanceOrderToAwaitingPayment,
  confirmOrderDelivered,
  createAndConfirmManualBankPayment,
  createCommissionsForOrder,
  releaseCommissionsNow,
  setCommissionHoldDays,
} from "@/lib/workflows/finance";

export async function completeLocalOrderSettlement(orderId: string) {
  const actor = await requireRole("owner", "finance_admin");
  await advanceOrderToAwaitingPayment(actor.id, orderId);
  await createAndConfirmManualBankPayment(actor.id, orderId);
  await confirmOrderDelivered(actor.id, orderId, `LOCAL-${orderId.slice(0, 8)}`);
  await createCommissionsForOrder(actor.id, orderId);
  await setCommissionHoldDays(0);
  const released = await releaseCommissionsNow(actor.id);
  return { ok: true, releasedCommissions: released.length };
}
