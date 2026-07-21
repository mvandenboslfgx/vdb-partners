"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionState = { error?: string; success?: string };

async function destinationForUser(userId: string) {
  const db = createAdminClient();
  const [{ data: roles, error: rolesError }, { data: seller, error: sellerError }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", userId),
    db.from("seller_profiles").select("status").eq("user_id", userId).maybeSingle(),
  ]);
  if (rolesError ?? sellerError) throw rolesError ?? sellerError;
  if (roles?.some(({ role }) => ["owner", "finance_admin", "sales_admin", "support_admin"].includes(role))) return "/admin";
  if (!seller || seller.status === "draft") return "/onboarding";
  return "/dashboard";
}

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  let destination: string;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Inloggen is momenteel niet beschikbaar. Probeer het opnieuw." };
    destination = await destinationForUser(data.user.id);
  } catch { return { error: "Inloggen is momenteel niet beschikbaar. Controleer de configuratie." }; }
  redirect(destination);
}

export async function registerPartner(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: String(formData.get("name") ?? "") }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/verify-email` } });
    if (error || !data.user) return { error: "Registratie is momenteel niet beschikbaar. Controleer de configuratie." };
    const { error: roleError } = await createAdminClient().from("user_roles").upsert({ user_id: data.user.id, role: "seller" }, { onConflict: "user_id,role" });
    if (roleError) return { error: "Registratie is momenteel niet beschikbaar. Controleer de configuratie." };
    return { success: "Controleer uw e-mail om uw account te verifiëren." };
  } catch { return { error: "Registratie is momenteel niet beschikbaar. Controleer de configuratie." }; }
}

export async function sendPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(String(formData.get("email") ?? ""), { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login` });
    return error ? { error: error.message } : { success: "Als dit e-mailadres bekend is, ontvangt u een resetlink." };
  } catch { return { error: "Wachtwoordherstel is momenteel niet beschikbaar." }; }
}
