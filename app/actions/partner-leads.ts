"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import {
  mapBackendErrorMessage,
  userMessageForPartnerError,
} from "@/lib/contract/errors";

const leadSchema = z.object({
  productId: z.string().uuid(),
  contactName: z.string().min(2).max(200),
  contactEmail: z.string().email().max(320),
  company: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  message: z.string().max(4000).optional(),
  customerType: z.enum(["b2c", "b2b"]).default("b2c"),
  consentContact: z.literal(true),
});

export type CreatePartnerLeadState = {
  error?: string;
  success?: boolean;
  leadId?: string;
};

export async function createPartnerLeadAction(
  _prev: CreatePartnerLeadState,
  formData: FormData,
): Promise<CreatePartnerLeadState> {
  const profile = await requireRole("partner");
  if (!profile.partnerApproved || profile.partnerStatus !== "ACTIVE") {
    return {
      error:
        "Lead aanmelden is alleen beschikbaar voor ACTIVE partners. Pending of geschorste accounts zijn geblokkeerd.",
    };
  }

  const parsed = leadSchema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    contactName: String(formData.get("contactName") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    message: String(formData.get("message") ?? "").trim() || undefined,
    customerType: String(formData.get("customerType") ?? "b2c"),
    consentContact: formData.get("consentContact") === "on",
  });

  if (!parsed.success) {
    return {
      error:
        "Controleer klantgegevens, toestemming voor contact en productkeuze.",
    };
  }

  const dedupeKey = [
    "partner-catalog",
    parsed.data.productId,
    parsed.data.contactEmail.toLowerCase(),
    new Date().toISOString().slice(0, 10),
  ].join(":");

  const notes = [
    `customer_type=${parsed.data.customerType}`,
    `consent_contact=true`,
    parsed.data.message ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_partner_lead", {
    p_contact_name: parsed.data.contactName,
    p_contact_email: parsed.data.contactEmail,
    p_dedupe_key: dedupeKey,
    p_company: parsed.data.company ?? null,
    p_phone: parsed.data.phone ?? null,
    p_message: notes,
    p_code: null,
    p_product_id: parsed.data.productId,
  });

  if (error) {
    const mapped = mapBackendErrorMessage(error.message);
    if (mapped) {
      return { error: userMessageForPartnerError(mapped) };
    }
    return {
      error:
        "Lead kon niet worden aangemaakt. Checkout blijft fail-closed; alleen lead/offerteaanvraag is beschikbaar.",
    };
  }

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/products");
  return { success: true, leadId: typeof data === "string" ? data : undefined };
}
