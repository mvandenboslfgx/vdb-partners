"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_REVIEW_REASON_CODES,
  type AdminReviewReasonCode,
} from "@/lib/partners/admin-review";

const OUTCOMES = ["VERIFIED", "REJECTED", "MANUAL_REVIEW", "NOT_STARTED"] as const;

export type AttestAdminReviewResult =
  | { ok: true; changed: boolean; status: string; missing: string[] }
  | { ok: false; code: string; message: string };

export async function attestPartnerAdminReview(input: {
  partnerId: string;
  outcome: string;
  reasonCode: string;
}): Promise<AttestAdminReviewResult> {
  await requireRole("owner", "admin", "staff");

  const outcome = input.outcome.trim().toUpperCase();
  const reasonCode = input.reasonCode.trim().toUpperCase();

  if (!OUTCOMES.includes(outcome as (typeof OUTCOMES)[number])) {
    return { ok: false, code: "VALIDATION_FAILED", message: "Ongeldige uitkomst." };
  }
  if (
    !(ADMIN_REVIEW_REASON_CODES as readonly string[]).includes(
      reasonCode as AdminReviewReasonCode,
    )
  ) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Ongeldige reason code.",
    };
  }
  if (!input.partnerId) {
    return { ok: false, code: "VALIDATION_FAILED", message: "Partner ontbreekt." };
  }

  // Must use the signed-in user session so require_aal2() applies.
  // Never use the service-role client for this mutation.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_attest_partner_admin_review", {
    p_partner_id: input.partnerId,
    p_outcome: outcome,
    p_reason_code: reasonCode,
  });

  if (error) {
    const msg = error.message ?? "RPC_FAILED";
    if (/AAL2_REQUIRED/i.test(msg)) {
      return {
        ok: false,
        code: "AAL2_REQUIRED",
        message:
          "AAL2-sessie vereist. Rond MFA step-up af (Owner/Mobile) en probeer opnieuw. Geen documentupload.",
      };
    }
    if (/FORBIDDEN|AUTH_REQUIRED|RATE_LIMITED|VALIDATION_FAILED|NOT_FOUND/i.test(msg)) {
      const code = msg.match(
        /FORBIDDEN|AUTH_REQUIRED|RATE_LIMITED|VALIDATION_FAILED|NOT_FOUND/i,
      )?.[0]?.toUpperCase() ?? "FORBIDDEN";
      return { ok: false, code, message: msg };
    }
    return { ok: false, code: "RPC_FAILED", message: msg };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const status =
    row && typeof row === "object" && "identity_verification_status" in row
      ? String((row as { identity_verification_status: string }).identity_verification_status)
      : outcome;
  const changed =
    row && typeof row === "object" && "changed" in row
      ? Boolean((row as { changed: boolean }).changed)
      : true;
  const missing =
    row &&
    typeof row === "object" &&
    "activation_missing" in row &&
    Array.isArray((row as { activation_missing: unknown }).activation_missing)
      ? ((row as { activation_missing: string[] }).activation_missing as string[])
      : [];

  revalidatePath("/admin/verifications");
  revalidatePath("/onboarding");
  return { ok: true, changed, status, missing };
}
