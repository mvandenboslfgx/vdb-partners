"use server";
import { requireRole } from "@/lib/auth/require-auth";
import { getEnv } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";

export async function confirmManualBankPayment(paymentId: string) {
  const actor = await requireRole("owner", "finance_admin");
  const db = createAdminClient();
  const { data: payment, error } = await db.from("payments").select("id, order_id, status, provider").eq("id", paymentId).eq("provider", "bank_transfer").single();
  if (error) throw error;
  if (payment.status === "paid") throw new Error("Payment was already confirmed");
  const timestamp = new Date().toISOString();
  const { error: updateError } = await db.from("payments").update({ status: "paid", paid_at: timestamp, verified_at: timestamp }).eq("id", paymentId);
  if (updateError) throw updateError;
  await Promise.all([
    db.from("orders").update({ status: "payment_verified" }).eq("id", payment.order_id).eq("status", "payment_received"),
    db.from("audit_logs").insert({ actor_id: actor.id, action: "payment.manual_confirmed", entity_type: "payments", entity_id: paymentId, after_data: { status: "paid" } }),
  ]);
}

export const verifyManualPayment = confirmManualBankPayment;

export async function createMolliePaymentLink(orderId: string) {
  const actor = await requireRole("owner", "finance_admin");
  if (!(await isFeatureEnabled("mollie_payments_enabled"))) throw new Error("Mollie payments are disabled");
  const env = getEnv();
  if (!env.MOLLIE_API_KEY) throw new Error("Mollie is enabled but MOLLIE_API_KEY is missing");
  const db = createAdminClient();
  const { data: order, error } = await db.from("orders").select("id, order_number, total_cents, currency, status").eq("id", orderId).single();
  if (error) throw error;
  if (order.status !== "payment_link_pending") throw new Error("Order must be awaiting payment-link creation");
  const response = await fetch("https://api.mollie.com/v2/payments", { method: "POST", headers: { Authorization: `Bearer ${env.MOLLIE_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: { currency: order.currency, value: (order.total_cents / 100).toFixed(2) }, description: `VDB order ${order.order_number}`, redirectUrl: `${env.NEXT_PUBLIC_APP_URL ?? env.MAIN_SITE_URL}/orders/${order.id}`, webhookUrl: env.NEXT_PUBLIC_APP_URL ? `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/mollie` : undefined, metadata: { order_id: order.id } }) });
  if (!response.ok) throw new Error(`Mollie payment link creation failed (${response.status})`);
  const mollie = await response.json() as { id: string; _links?: { checkout?: { href?: string } } };
  const { error: paymentError } = await db.from("payments").insert({ order_id: order.id, provider: "mollie", provider_payment_id: mollie.id, status: "open", amount_cents: order.total_cents, currency: order.currency });
  if (paymentError) throw paymentError;
  await db.from("orders").update({ status: "awaiting_payment" }).eq("id", order.id);
  await db.from("audit_logs").insert({ actor_id: actor.id, action: "payment.mollie_link_created", entity_type: "orders", entity_id: order.id, after_data: { mollie_payment_id: mollie.id } });
  return { paymentId: mollie.id, checkoutUrl: mollie._links?.checkout?.href ?? null };
}
