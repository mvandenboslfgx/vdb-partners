import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isRole, type Role } from "@/lib/auth/roles";

export interface CurrentProfile { id: string; role: Role; sellerApproved: boolean; email: string | null; }

export async function getSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getCurrentProfile(user?: User): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const currentUser = user ?? (await supabase.auth.getUser()).data.user;
  if (!currentUser) return null;
  const { data, error } = await supabase.from("profiles").select("id, role, seller_approved").eq("id", currentUser.id).maybeSingle();
  if (error) throw error;
  if (!data || !isRole(data.role)) return null;
  return { id: data.id as string, role: data.role, sellerApproved: Boolean(data.seller_approved), email: currentUser.email ?? null };
}
