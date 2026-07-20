"use server";
import { requirePermission } from "@/lib/auth/require-auth";
import { generateSellerCode } from "@/lib/referrals/codes";
import { createAdminClient } from "@/lib/supabase/admin";

async function changeSellerStatus(sellerId: string, status: "approved" | "rejected" | "suspended" | "blocked", reason: string) {
  const actor = await requirePermission("approve_seller");
  if (!reason.trim()) throw new Error("A reason is required");
  const db = createAdminClient();
  const { data: seller, error } = await db.from("seller_profiles").select("id, user_id, status, referral_code").eq("id", sellerId).single();
  if (error) throw error;
  const updates: Record<string, unknown> = { status };
  if (status === "approved") {
    updates.approved_at = new Date().toISOString();
    updates.referral_code = seller.referral_code || generateSellerCode();
  }
  if (status === "suspended" || status === "blocked") updates.suspended_at = new Date().toISOString();
  const { error: updateError } = await db.from("seller_profiles").update(updates).eq("id", sellerId);
  if (updateError) throw updateError;
  await Promise.all([
    db.from("seller_status_history").insert({ seller_id: sellerId, from_status: seller.status, to_status: status, reason, changed_by: actor.id }),
    db.from("audit_logs").insert({ actor_id: actor.id, action: `seller.${status}`, entity_type: "seller_profiles", entity_id: sellerId, before_data: { status: seller.status }, after_data: { status, reason } }),
  ]);
}

export async function approveSeller(sellerId: string, reason = "Approved after review") {
  return changeSellerStatus(sellerId, "approved", reason);
}
export async function rejectSeller(sellerId: string, reason: string) {
  return changeSellerStatus(sellerId, "rejected", reason);
}
export async function suspendSeller(sellerId: string, reason: string) {
  return changeSellerStatus(sellerId, "suspended", reason);
}
export async function blockSeller(sellerId: string, reason: string) {
  return changeSellerStatus(sellerId, "blocked", reason);
}
