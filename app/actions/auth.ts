"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { destinationForIdentity } from "@/lib/auth/destination";
import { resolvePartnerIdentity } from "@/lib/auth/identity";
import {
  PartnerPortalError,
  userMessageForPartnerError,
} from "@/lib/contract/errors";
import { assertPartnerSupabaseEnvironment } from "@/lib/contract/env";
import {
  partnerApplicationIntakeSchema,
  sanitizePartnerApplicationForSubmit,
} from "@/lib/validation/partner-application";
import { resolvePartnerTypeFromChoice } from "@/lib/validation/partner-type";

export type ActionState = { error?: string; success?: string };

async function destinationForUser(userId: string, email: string | null) {
  assertPartnerSupabaseEnvironment(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabase = await createClient();
  const identity = await resolvePartnerIdentity(supabase, userId, email);
  return destinationForIdentity(identity).path;
}

export async function signIn(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let destination: string;
  try {
    assertPartnerSupabaseEnvironment(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (error) return { error: error.message };
    if (!data.user)
      return {
        error: "Inloggen is momenteel niet beschikbaar. Probeer het opnieuw.",
      };
    destination = await destinationForUser(
      data.user.id,
      data.user.email ?? null,
    );
  } catch (caught) {
    if (caught instanceof PartnerPortalError) {
      return { error: userMessageForPartnerError(caught.code) };
    }
    return {
      error:
        "Inloggen is momenteel niet beschikbaar. Controleer de configuratie.",
    };
  }
  redirect(destination);
}

export async function registerPartner(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    assertPartnerSupabaseEnvironment(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const supabase = await createClient();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim() || "Partner";
    const partnerTypeChoice = String(formData.get("partnerType") ?? "");
    const resolvedType = resolvePartnerTypeFromChoice(partnerTypeChoice);

    const intake = partnerApplicationIntakeSchema.safeParse({
      partnerType: resolvedType,
      legalName: name,
      tradeName:
        String(formData.get("tradeName") ?? "").trim() ||
        String(formData.get("companyName") ?? "").trim() ||
        name,
      contactEmail: email,
      companyName:
        String(formData.get("companyName") ?? "").trim() || undefined,
      kvkNumber: String(formData.get("kvkNumber") ?? "").trim() || undefined,
      vatNumber: String(formData.get("vatNumber") ?? "").trim() || undefined,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      businessSubtype:
        String(formData.get("businessSubtype") ?? "").trim() || undefined,
    });

    if (!intake.success) {
      const first = intake.error.issues[0]?.message;
      return {
        error:
          first ??
          "Kies expliciet Particulier of Zakelijk en controleer de verplichte velden.",
      };
    }

    const payload = sanitizePartnerApplicationForSubmit(intake.data);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          partner_type: payload.partnerType,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/verify-email`,
      },
    });
    if (error || !data.user) {
      return {
        error:
          "Registratie is momenteel niet beschikbaar. Controleer de configuratie.",
      };
    }

    // Owner RC5 typed application — never activates; never inserts legacy user_roles.
    const { error: applicationError } = await supabase.rpc(
      "submit_partner_application",
      {
        p_partner_type: payload.partnerType,
        p_legal_name: payload.legalName,
        p_trade_name: payload.tradeName,
        p_contact_email: payload.contactEmail,
        p_kvk: payload.kvk,
        p_vat: payload.vat,
        p_phone: payload.phone,
      },
    );
    if (applicationError) {
      return {
        error:
          "Account aangemaakt, maar partneraanvraag kon niet worden ingediend. Log later in of neem contact op met support.",
      };
    }
    return { success: "Controleer uw e-mail om uw account te verifiëren." };
  } catch {
    return {
      error:
        "Registratie is momenteel niet beschikbaar. Controleer de configuratie.",
    };
  }
}

export async function sendPasswordReset(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    assertPartnerSupabaseEnvironment(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      String(formData.get("email") ?? ""),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`,
      },
    );
    return error
      ? { error: error.message }
      : { success: "Als dit e-mailadres bekend is, ontvangt u een resetlink." };
  } catch {
    return { error: "Wachtwoordherstel is momenteel niet beschikbaar." };
  }
}

/** Exported for unit tests — pure routing uses destinationForIdentity. */
export { destinationForUser };
