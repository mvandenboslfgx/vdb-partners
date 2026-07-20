import { env } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { Payment, PaymentStatus, PaymentProvider } from "@/lib/payments/types";

type MolliePayment = { id: string; status: string; amount: { value: string; currency: string }; metadata?: { orderId?: string }; _links?: { checkout?: { href: string } } };
export function mapMollieStatus(status: string): PaymentStatus {
  const map: Record<string, PaymentStatus> = { open: "open", pending: "pending", paid: "paid", failed: "failed", canceled: "canceled", expired: "expired" };
  return map[status] ?? "failed";
}
async function enabled() {
  if (!(await isFeatureEnabled("mollie_payments_enabled")) || !env.MOLLIE_API_KEY) throw new Error("Mollie payments are disabled or MOLLIE_API_KEY is missing");
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  await enabled();
  const response = await fetch(`https://api.mollie.com/v2${path}`, { ...init, headers: { Authorization: `Bearer ${env.MOLLIE_API_KEY}`, "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(`Mollie API error (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}
const map = (payment: MolliePayment): Payment => ({ id: payment.id, orderId: payment.metadata?.orderId ?? "", amount: Math.round(Number(payment.amount.value) * 100), currency: payment.amount.currency, status: mapMollieStatus(payment.status), checkoutUrl: payment._links?.checkout?.href });
export const mollie: PaymentProvider = {
  async createPayment(input) {
    const payment = await request<MolliePayment>("/payments", { method: "POST", body: JSON.stringify({ amount: { value: (input.amount / 100).toFixed(2), currency: input.currency ?? "EUR" }, description: input.description, redirectUrl: input.redirectUrl, webhookUrl: input.webhookUrl, metadata: { orderId: input.orderId } }) });
    return map(payment);
  },
  async getPayment(id) { return map(await request<MolliePayment>(`/payments/${encodeURIComponent(id)}`)); },
};
