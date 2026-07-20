import { createAdminClient } from "@/lib/supabase/admin";
import { mollie } from "@/lib/payments/mollie";

/** Idempotently fetches Mollie's source of truth and records one webhook event per provider event id. */
export async function processMollieWebhook(paymentId: string, eventId = paymentId) {
  if (!paymentId) throw new Error("Missing Mollie payment id");
  const db = createAdminClient();
  const { error: insertError } = await db.from("payment_webhook_events").insert({ provider: "mollie", provider_event_id: eventId, payment_id: paymentId });
  if (insertError?.code === "23505") return { processed: false as const, reason: "duplicate" as const };
  if (insertError) throw insertError;
  const payment = await mollie.getPayment(paymentId);
  const { error } = await db.from("payments").update({ status: payment.status, verified_at: payment.status === "paid" ? new Date().toISOString() : null }).eq("provider_payment_id", paymentId);
  if (error) throw error;
  return { processed: true as const, payment };
}
