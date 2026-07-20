import { NextResponse } from "next/server";
import { processMollieWebhook } from "@/lib/payments/webhook";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const paymentId = String(form?.get("id") ?? "");
  if (!paymentId) return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  try { const result = await processMollieWebhook(paymentId); return NextResponse.json(result); }
  catch (error) { console.error("Mollie webhook failed", error); return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 }); }
}
