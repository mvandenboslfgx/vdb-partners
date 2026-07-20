"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: string };

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") });
    if (error) return { error: error.message };
  } catch { return { error: "Inloggen is momenteel niet beschikbaar. Controleer de configuratie." }; }
  redirect("/dashboard");
}

export async function registerPartner(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: String(formData.get("name") ?? "") }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/verify-email` } });
    return error ? { error: error.message } : { success: "Controleer uw e-mail om uw account te verifiëren." };
  } catch { return { error: "Registratie is momenteel niet beschikbaar. Controleer de configuratie." }; }
}

export async function sendPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(String(formData.get("email") ?? ""), { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login` });
    return error ? { error: error.message } : { success: "Als dit e-mailadres bekend is, ontvangt u een resetlink." };
  } catch { return { error: "Wachtwoordherstel is momenteel niet beschikbaar." }; }
}
