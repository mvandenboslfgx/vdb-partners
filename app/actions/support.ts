"use server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
export async function createSupportRequest(formData: FormData) { const profile = await requireAuth(); const { error } = await (await createClient()).from("support_tickets").insert({ profile_id: profile.id, subject: String(formData.get("subject") ?? ""), message: String(formData.get("message") ?? ""), status: "open" }); if (error) throw error; return { ok: true }; }
