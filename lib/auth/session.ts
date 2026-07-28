import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  resolvePartnerIdentity,
  type PartnerIdentity,
} from "@/lib/auth/identity";
import { isRole, type Role } from "@/lib/auth/roles";
import { assertPartnerSupabaseEnvironment } from "@/lib/contract/env";

export interface CurrentProfile {
  id: string;
  role: Role;
  sellerApproved: boolean;
  partnerApproved: boolean;
  partnerProfileId: string | null;
  partnerStatus: string | null;
  email: string | null;
  identity: PartnerIdentity;
}

export async function getSession() {
  assertPartnerSupabaseEnvironment(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getCurrentProfile(
  user?: User,
): Promise<CurrentProfile | null> {
  assertPartnerSupabaseEnvironment(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabase = await createClient();
  const currentUser = user ?? (await supabase.auth.getUser()).data.user;
  if (!currentUser) return null;

  const identity = await resolvePartnerIdentity(
    supabase,
    currentUser.id,
    currentUser.email ?? null,
  );
  if (!identity.primaryRole || !isRole(identity.primaryRole)) return null;

  const partnerApproved = identity.primaryRole === "partner";
  return {
    id: currentUser.id,
    role: identity.primaryRole,
    sellerApproved: partnerApproved,
    partnerApproved,
    partnerProfileId: identity.partnerProfileId,
    partnerStatus: identity.partnerStatus,
    email: currentUser.email ?? null,
    identity,
  };
}
