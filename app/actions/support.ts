"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { mapLogicalTableToOwner } from "@/lib/contract/surfaces";
import { requireActivePartnerCapability } from "@/lib/partners/capabilities";
import { buildRateLimitKey, rateLimit } from "@/lib/security/rate-limit";

async function clientIp() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function newTicketNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PTR-${stamp}-${rand}`;
}

async function resolveCallerOrganizationId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error("Unable to resolve organization membership.");
  }
  const organizationId =
    data && typeof data.organization_id === "string"
      ? data.organization_id
      : null;
  if (!organizationId) {
    throw new Error(
      "AUTH_NO_ACCESS:organization_members — Partner tickets require organization membership.",
    );
  }
  return organizationId;
}

/**
 * Creates a Partner-owned support ticket on Owner `portal_support_tickets`.
 * Capability: support_own_tickets (allowed for PENDING/ACTIVE/SUSPENDED).
 * Isolation: RLS org membership + created_by = auth.uid().
 */
export async function createSupportRequest(formData: FormData) {
  const profile = await requireAuth();
  requireActivePartnerCapability(
    "support_own_tickets",
    profile.partnerStatus,
  );

  const limited = rateLimit(
    buildRateLimitKey("support:create", {
      ip: await clientIp(),
      email: profile.email,
    }),
    { limit: 10, windowMs: 60_000 },
  );
  if (!limited.success) {
    throw new Error("Te veel verzoeken. Probeer het later opnieuw.");
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const category = String(formData.get("category") ?? "OTHER")
    .trim()
    .toUpperCase();
  if (subject.length < 3 || message.length < 8) {
    throw new Error("Onderwerp en bericht zijn verplicht.");
  }

  const supabase = await createClient();
  const organizationId = await resolveCallerOrganizationId(
    supabase,
    profile.id,
  );
  const table = mapLogicalTableToOwner("support_tickets");

  const { data, error } = await supabase
    .from(table)
    .insert({
      organization_id: organizationId,
      ticket_number: newTicketNumber(),
      subject,
      description: message,
      category,
      priority: "NORMAL",
      status: "NEW",
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  if (!data?.id) throw new Error("Ticket create returned empty id.");
  redirect(`/dashboard/support/${data.id}`);
}

/**
 * Public Partner reply via Owner `reply_portal_support_ticket`.
 * Never writes is_internal=true. Never falls back to external reply on note RPC.
 */
export async function replySupportRequest(formData: FormData) {
  const profile = await requireAuth();
  requireActivePartnerCapability(
    "support_own_tickets",
    profile.partnerStatus,
  );

  const limited = rateLimit(
    buildRateLimitKey("support:reply", {
      ip: await clientIp(),
      email: profile.email,
    }),
    { limit: 20, windowMs: 60_000 },
  );
  if (!limited.success) {
    throw new Error("Te veel verzoeken. Probeer het later opnieuw.");
  }

  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!ticketId || body.length < 1) {
    throw new Error("Ticket en bericht zijn verplicht.");
  }

  const supabase = await createClient();
  // Ownership probe — RLS must allow SELECT on own org ticket.
  const ticketsTable = mapLogicalTableToOwner("support_tickets");
  const { data: ticket, error: ticketError } = await supabase
    .from(ticketsTable)
    .select("id, status")
    .eq("id", ticketId)
    .maybeSingle();
  if (ticketError) throw ticketError;
  if (!ticket?.id) {
    throw new Error("Ticket niet gevonden of geen toegang.");
  }
  const status = String(ticket.status ?? "").toUpperCase();
  if (status === "CLOSED" || status === "RESOLVED") {
    throw new Error("Dit ticket is gesloten voor nieuwe reacties.");
  }

  const { error } = await supabase.rpc("reply_portal_support_ticket", {
    p_ticket_id: ticketId,
    p_body: body,
  });
  if (error) throw error;
  redirect(`/dashboard/support/${ticketId}`);
}
