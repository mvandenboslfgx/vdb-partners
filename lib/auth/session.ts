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

  const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
    supabase.from("profiles").select("id, display_name").eq("id", currentUser.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", currentUser.id),
  ]);
  if (profileError) throw profileError;
  if (rolesError) throw rolesError;
  if (!profile) return null;

  const rolePriority: Role[] = ["owner", "finance_admin", "sales_admin", "support_admin", "seller"];
  const role = rolePriority.find((candidate) => roles?.some((assignment) => assignment.role === candidate));
  if (!role || !isRole(role)) return null;

  let sellerApproved = false;
  if (roles?.some((assignment) => assignment.role === "seller")) {
    const { data: seller, error: sellerError } = await supabase
      .from("seller_profiles")
      .select("status")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    if (sellerError) throw sellerError;
    sellerApproved = seller?.status === "approved";
  }

  return { id: profile.id, role, sellerApproved, email: currentUser.email ?? null };
}
