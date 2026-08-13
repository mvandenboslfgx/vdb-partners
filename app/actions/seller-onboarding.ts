"use server";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertLocalLegacySellerDomainAllowed } from "@/lib/contract/local-legacy";
import { generateSellerCode } from "@/lib/referrals/codes";
import { encrypt } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/admin";

const personalSchema = z.object({
  name: z.string().trim().min(2).max(120),
  dateOfBirth: z.coerce
    .date()
    .refine(
      (value) => (Date.now() - value.getTime()) / 31_557_600_000 >= 18,
      "You must be at least 18",
    ),
});
const accountSchema = z.object({
  accountType: z.enum(["particular", "sole_trader", "company"]),
  publicName: z.string().trim().min(2).max(160),
  legalName: z.string().trim().min(2).max(160).optional(),
  registrationNumber: z.string().trim().max(80).optional(),
  vatNumber: z.string().trim().max(80).optional(),
  countryCode: z.string().trim().length(2).default("NL"),
});
const payoutSchema = z
  .object({
    method: z.enum(["bank_transfer", "cash"]),
    iban: z
      .string()
      .trim()
      .min(15)
      .max(34)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value ? value : undefined)),
    accountHolder: z
      .string()
      .trim()
      .min(2)
      .max(160)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value ? value : undefined)),
  })
  .superRefine((value, ctx) => {
    if (
      value.method === "bank_transfer" &&
      (!value.iban || !value.accountHolder)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "IBAN and account holder are required",
      });
    }
  });

async function sellerForUser(userId: string) {
  assertLocalLegacySellerDomainAllowed();
  const db = createAdminClient();
  const { data, error } = await db
    .from("seller_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Complete account type first");
  return { db, seller: data };
}

export async function savePersonalDetails(input: unknown) {
  const profile = await requireAuth();
  const details = personalSchema.parse(input);
  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ display_name: details.name })
    .eq("id", profile.id);
  if (error) throw error;
  await db
    .from("audit_logs")
    .insert({
      actor_id: profile.id,
      action: "seller.personal_details_saved",
      entity_type: "profiles",
      entity_id: profile.id,
      after_data: { date_of_birth_verified: true },
    });
  return { ok: true };
}

export async function saveAccountType(input: unknown) {
  const profile = await requireAuth();
  const account = accountSchema.parse(input);
  const db = createAdminClient();
  const { data: seller, error } = await db
    .from("seller_profiles")
    .upsert(
      {
        user_id: profile.id,
        account_type: account.accountType,
        public_name: account.publicName,
        referral_code: generateSellerCode(),
        payout_method: "cash",
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) throw error;
  if (account.accountType !== "particular") {
    if (!account.legalName) throw new Error("Legal business name is required");
    const { error: businessError } = await db
      .from("seller_business_profiles")
      .upsert(
        {
          seller_id: seller.id,
          legal_name: account.legalName,
          registration_number: account.registrationNumber ?? null,
          vat_number: account.vatNumber ?? null,
          country_code: account.countryCode.toUpperCase(),
        },
        { onConflict: "seller_id" },
      );
    if (businessError) throw businessError;
  }
  return seller;
}

export async function savePayoutPreference(input: unknown) {
  const profile = await requireAuth();
  const preference = payoutSchema.parse(input);
  const { db, seller } = await sellerForUser(profile.id);
  const iban =
    preference.method === "bank_transfer"
      ? preference.iban!.replace(/\s/g, "").toUpperCase()
      : null;
  const { error } = await db
    .from("seller_profiles")
    .update({
      payout_method: preference.method,
      payout_iban: iban ? encrypt(iban) : null,
      payout_account_holder:
        preference.method === "bank_transfer" ? preference.accountHolder : null,
    })
    .eq("id", seller.id);
  if (error) throw error;
  await db
    .from("audit_logs")
    .insert({
      actor_id: profile.id,
      action: "seller.payout_preference_saved",
      entity_type: "seller_profiles",
      entity_id: seller.id,
      after_data: {
        method: preference.method,
        iban_masked: iban ? `${iban.slice(0, 4)}••••${iban.slice(-4)}` : null,
      },
    });
  return { ok: true };
}

/**
 * QUARANTINED — legacy seller_profiles path; not used by RC5 Owner partner onboarding.
 * Partners v1 has no automatic ID-check, camera IDV, document upload, or selfie flow.
 * Calling this must fail closed.
 */
export async function startVerification() {
  throw new Error(
    "QUARANTINED: automatic identity verification is not part of Partners v1",
  );
}

export async function acceptAgreement(versionId: string, name: string) {
  const profile = await requireAuth();
  if (!name.trim()) throw new Error("Your full name is required");
  const { db, seller } = await sellerForUser(profile.id);
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0];
  const ipHash = forwardedFor
    ? createHash("sha256").update(forwardedFor).digest("hex")
    : null;
  const { error } = await db
    .from("partner_agreement_acceptances")
    .upsert(
      {
        seller_id: seller.id,
        agreement_version_id: versionId,
        accepted_by: profile.id,
        ip_hash: ipHash,
      },
      { onConflict: "seller_id,agreement_version_id" },
    );
  if (error) throw error;
  await db
    .from("audit_logs")
    .insert({
      actor_id: profile.id,
      action: "seller.agreement_accepted",
      entity_type: "partner_agreement_versions",
      entity_id: versionId,
      after_data: {
        signer_name: name.trim(),
        user_agent: (requestHeaders.get("user-agent") ?? "").slice(0, 512),
        accepted_at: new Date().toISOString(),
      },
    });
  return { ok: true };
}

export async function submitForReview() {
  const profile = await requireAuth();
  const { db, seller } = await sellerForUser(profile.id);
  if (
    seller.payout_method === "bank_transfer" &&
    (!seller.payout_iban || !seller.payout_account_holder)
  )
    throw new Error("Payout details are incomplete");
  const [{ data: verification }, { data: agreement }] = await Promise.all([
    db
      .from("seller_verifications")
      .select("id")
      .eq("seller_id", seller.id)
      .eq("verification_type", "identity")
      .maybeSingle(),
    db
      .from("partner_agreement_acceptances")
      .select("id")
      .eq("seller_id", seller.id)
      .limit(1)
      .maybeSingle(),
  ]);
  if (!verification || !agreement)
    throw new Error("Verification and agreement acceptance are required");
  const { error } = await db
    .from("seller_profiles")
    .update({ status: "pending_review" })
    .eq("id", seller.id)
    .eq("status", "draft");
  if (error) throw error;
  return { ok: true };
}

/** Compatibility wrapper for the original one-step form. */
export async function saveOnboarding(formData: FormData) {
  return savePersonalDetails({
    name: String(formData.get("name") ?? ""),
    dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
  });
}
