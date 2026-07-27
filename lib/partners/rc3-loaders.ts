import { createClient } from "@/lib/supabase/server";
import {
  assertOwnerContractTable,
  mapLogicalTableToOwner,
} from "@/lib/contract/surfaces";

export type PartnerConversationRow = {
  id: string;
  subject: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
};

export type PartnerMessageRow = {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author_user_id: string;
};

export type PartnerSupportTicketRow = {
  id: string;
  category: string;
  subject?: string | null;
  status: string;
  created_at: string;
  description: string;
};

export type PartnerSupportReplyRow = {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
};

export type PartnerAppointmentRow = {
  id: string;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
};

export async function loadPartnerConversations() {
  assertOwnerContractTable("portal_conversations");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_conversations")
    .select("id, subject, status, last_message_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as PartnerConversationRow[];
}

export async function loadConversationMessages(conversationId: string) {
  assertOwnerContractTable("portal_messages");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_messages")
    .select("id, body, is_internal, created_at, author_user_id")
    .eq("conversation_id", conversationId)
    .eq("is_internal", false)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as PartnerMessageRow[];
}

export async function loadConversationReadState(
  conversationId: string,
  userId: string,
) {
  assertOwnerContractTable("portal_conversation_participants");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_conversation_participants")
    .select("last_read_at, user_id, conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadMessageAttachments(messageId: string) {
  assertOwnerContractTable("portal_message_attachments");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_message_attachments")
    .select("id, message_id, file_name, created_at")
    .eq("message_id", messageId)
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function loadPartnerSupportTickets() {
  assertOwnerContractTable("portal_support_tickets");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_support_tickets")
    .select("id, category, status, created_at, description")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as PartnerSupportTicketRow[];
}

export async function loadPublicSupportReplies(ticketId: string) {
  const table = mapLogicalTableToOwner("support_messages");
  assertOwnerContractTable(table);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("id, body, is_internal, created_at")
    .eq("ticket_id", ticketId)
    .eq("is_internal", false)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as PartnerSupportReplyRow[];
}

export async function loadPartnerAppointments() {
  assertOwnerContractTable("portal_appointments");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_appointments")
    .select("id, title, status, starts_at, ends_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as (PartnerAppointmentRow & { title?: string })[];
}

export async function tryBookAppointmentFailClosed(args: {
  organizationId: string;
  title: string;
  startsAt: string;
  endsAt: string;
}) {
  assertOwnerContractTable("portal_appointments");
  const supabase = await createClient();
  const { data: flags } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", "appointments_booking")
    .maybeSingle();
  if (flags?.enabled !== true) {
    return {
      ok: false as const,
      reason: "appointments_booking_disabled" as const,
    };
  }
  const { error } = await supabase.rpc("book_portal_appointment", {
    p_organization_id: args.organizationId,
    p_title: args.title,
    p_starts_at: args.startsAt,
    p_ends_at: args.endsAt,
  });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}
