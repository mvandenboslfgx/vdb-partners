"use server";

import { requirePermission } from "@/lib/auth/require-auth";
import { releaseAvailableCommissions } from "@/app/actions/commissions";
import { transitionOrderStatus } from "@/app/actions/orders";
import { createAdminClient } from "@/lib/supabase/admin";

export async function confirmDelivery(orderId: string, deliveryReference: string) {
  await requirePermission("confirm_delivery");
  if (!deliveryReference.trim()) throw new Error("A delivery reference is required");
  const db = createAdminClient();
  const { data: order, error } = await db.from("orders").select("id, status").eq("id", orderId).single();
  if (error) throw error;
  if (order.status === "in_fulfilment") await transitionOrderStatus(orderId, "delivered", `Delivery confirmed: ${deliveryReference.trim()}`);
  else if (order.status !== "delivered") throw new Error("Order must be in fulfilment before delivery can be confirmed");
  const timestamp = new Date().toISOString();
  const { error: fulfilmentError } = await db.from("fulfilments").upsert({ order_id: orderId, status: "delivered", delivery_reference: deliveryReference.trim(), delivered_at: timestamp }, { onConflict: "order_id" });
  if (fulfilmentError) throw fulfilmentError;
  // The release helper checks delivery timestamps and configured hold days.
  await releaseAvailableCommissions();
  return { ok: true };
}
