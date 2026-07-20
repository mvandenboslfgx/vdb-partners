"use server";

import { requireRole } from "@/lib/auth/require-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Creates immutable commission calculations only after VDB has verified payment. */
export async function calculateAndCreateCommission(orderId: string) {
  const actor = await requireRole("owner", "finance_admin");
  const db = createAdminClient();
  const { data: order, error } = await db.from("orders").select("id, seller_id, status").eq("id", orderId).single();
  if (error) throw error;
  if (!order.seller_id || order.status !== "payment_verified") throw new Error("Commission requires a seller order with verified payment");
  const { data: payment } = await db.from("payments").select("id").eq("order_id", orderId).eq("status", "paid").not("verified_at", "is", null).maybeSingle();
  if (!payment) throw new Error("Verified VDB payment is required");
  const { data: items, error: itemsError } = await db.from("order_items").select("id, variant_id, line_subtotal_cents").eq("order_id", orderId);
  if (itemsError) throw itemsError;
  let created = 0;
  for (const item of items ?? []) {
    const { data: variant } = await db.from("product_variants").select("product_id").eq("id", item.variant_id).single();
    const { data: rule } = await db.from("commission_rule_versions").select("*").or(`product_id.eq.${variant?.product_id},product_id.is.null`).lte("effective_from", new Date().toISOString()).or(`effective_to.is.null,effective_to.gt.${new Date().toISOString()}`).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    if (!rule) continue;
    const amount = rule.calculation_type === "fixed_amount" ? rule.fixed_amount_cents : Math.round(item.line_subtotal_cents * rule.percentage_bps / 10_000);
    const { data: calculation, error: calculationError } = await db.from("commission_calculations").insert({ order_item_id: item.id, seller_id: order.seller_id, commission_rule_version_id: rule.id, basis_amount_cents: item.line_subtotal_cents, calculated_amount_cents: amount }).select("id").maybeSingle();
    if (calculationError?.code === "23505") continue;
    if (calculationError || !calculation) throw calculationError ?? new Error("Commission calculation failed");
    const { error: commissionError } = await db.from("commissions").insert({ calculation_id: calculation.id, seller_id: order.seller_id, order_id: orderId, status: "pending", amount_cents: amount });
    if (commissionError) throw commissionError;
    created++;
  }
  await db.from("audit_logs").insert({ actor_id: actor.id, action: "commission.calculated", entity_type: "orders", entity_id: orderId, after_data: { created } });
  return { created };
}

/** Cron/admin release. Database trigger remains the final authority on hold timing. */
export async function releaseAvailableCommissions() {
  const actor = await requireRole("owner", "finance_admin");
  const db = createAdminClient();
  const { data: candidates, error } = await db.from("commissions").select("id, order_id").eq("status", "pending");
  if (error) throw error;
  let released = 0;
  for (const commission of candidates ?? []) {
    const { data: order } = await db.from("orders").select("delivered_at").eq("id", commission.order_id).maybeSingle();
    if (!order?.delivered_at) continue;
    const { data: setting } = await db.from("system_settings").select("value").eq("key", "commission_hold_days").maybeSingle();
    const holdDays = Number(setting?.value ?? 7);
    const availableAt = new Date(new Date(order.delivered_at).getTime() + holdDays * 86_400_000);
    if (availableAt > new Date()) continue;
    const { error: updateError } = await db.from("commissions").update({ status: "available", available_at: availableAt.toISOString() }).eq("id", commission.id).eq("status", "pending");
    if (updateError) throw updateError;
    released++;
  }
  await db.from("audit_logs").insert({ actor_id: actor.id, action: "commission.released", entity_type: "commissions", after_data: { released } });
  return { released };
}
