import { createClient } from "@/lib/supabase/server";
import { assertRc2OwnerTable } from "@/lib/contract/surfaces";
import {
  mapBackendErrorMessage,
  PartnerPortalError,
  userMessageForPartnerError,
} from "@/lib/contract/errors";

export type PartnerDashboardSummary = {
  partnerId: string | null;
  status: string | null;
  displayName: string | null;
  email: string | null;
  leads: number;
  sales: number;
  commissions: number;
  availableCents: number | null;
  code: string | null;
};

async function countForPartner(
  table: string,
  partnerId: string,
): Promise<number> {
  assertRc2OwnerTable(table);
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("partner_id", partnerId);
  if (error) {
    const mapped = mapBackendErrorMessage(error.message);
    if (mapped)
      throw new PartnerPortalError(mapped, userMessageForPartnerError(mapped));
    throw error;
  }
  return count ?? 0;
}

export async function loadPartnerDashboardSummary(
  userId: string,
  email: string | null,
): Promise<PartnerDashboardSummary> {
  assertRc2OwnerTable("partner_profiles");
  const supabase = await createClient();
  const { data: partner, error } = await supabase
    .from("partner_profiles")
    .select("id, status, display_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!partner) {
    return {
      partnerId: null,
      status: null,
      displayName: null,
      email,
      leads: 0,
      sales: 0,
      commissions: 0,
      availableCents: null,
      code: null,
    };
  }

  const [codeResult, leads, sales, commissions, summary, liability] =
    await Promise.all([
      supabase
        .from("partner_codes")
        .select("code_display")
        .eq("partner_id", partner.id)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle(),
      countForPartner("partner_leads", partner.id),
      countForPartner("partner_sales", partner.id),
      countForPartner("partner_commissions", partner.id),
      supabase.rpc("partner_financial_summary", { p_partner_id: partner.id }),
      supabase.rpc("partner_available_liability_cents", {
        p_partner_id: partner.id,
      }),
    ]);

  const availableCents =
    Array.isArray(summary.data) &&
    summary.data[0] &&
    typeof summary.data[0].available_cents === "number"
      ? summary.data[0].available_cents
      : typeof liability.data === "number"
        ? liability.data
        : null;

  return {
    partnerId: partner.id,
    status: partner.status,
    displayName: partner.display_name,
    email,
    leads,
    sales,
    commissions,
    availableCents,
    code: codeResult.data?.code_display
      ? String(codeResult.data.code_display)
      : null,
  };
}

export async function loadPartnerLeads(partnerId: string) {
  assertRc2OwnerTable("partner_leads");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partner_leads")
    .select(
      "id, status, contact_name, contact_email, company_name, product_id, product_slug, created_at",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export type PartnerCatalogItem = {
  product_id: string;
  slug: string;
  name: string;
  short_description: string | null;
  category_slug: string | null;
  category_name: string | null;
  price_cents: number | null;
  from_price_cents: number | null;
  price_label: string | null;
  billing_type: string | null;
  currency: string | null;
  vat_percent: number | null;
  audience_b2b: boolean | null;
  audience_b2c: boolean | null;
  delivery_time: string | null;
  primary_image_path: string | null;
  partner_visibility: string | null;
  partner_commission_type: string | null;
  partner_commission_value: number | null;
  partner_commission_currency: string | null;
  partner_commission_status: string | null;
  partner_requires_approval: boolean | null;
  partner_terms: string | null;
  partner_sales_copy: string | null;
  partner_availability: string | null;
  partner_featured: boolean | null;
  partner_priority: number | null;
  cta_mode: string | null;
};

/** Owner SSOT catalog via SECURITY DEFINER RPC — never query products table directly. */
export async function loadPartnerCatalog(): Promise<PartnerCatalogItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_partner_catalog");
  if (error) {
    const mapped = mapBackendErrorMessage(error.message);
    if (mapped)
      throw new PartnerPortalError(mapped, userMessageForPartnerError(mapped));
    throw error;
  }
  return (data as PartnerCatalogItem[] | null) ?? [];
}

export async function loadPartnerCommissions(partnerId: string) {
  assertRc2OwnerTable("partner_commissions");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partner_commissions")
    .select("id, status, amount_cents, currency, created_at, paid_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function loadPartnerSales(partnerId: string) {
  assertRc2OwnerTable("partner_sales");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partner_sales")
    .select(
      "id, status, gross_amount_cents, currency, confirmed_at, created_at",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function loadPartnerPayouts(partnerId: string) {
  assertRc2OwnerTable("partner_payouts");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partner_payouts")
    .select("id, status, amount_cents, currency, created_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
