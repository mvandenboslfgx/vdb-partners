import { NextResponse } from "next/server";
import { processMollieWebhook } from "@/lib/payments/webhook";
import { buildRateLimitKey, rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const limited = rateLimit(
    buildRateLimitKey("webhook:mollie", { ip }),
    { limit: 60, windowMs: 60_000 },
  );
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const paymentId = String(form?.get("id") ?? "");
  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }
  try {
    const result = await processMollieWebhook(paymentId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Mollie webhook failed", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
