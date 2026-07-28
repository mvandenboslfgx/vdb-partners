import { STAGING_PROJECT_REF } from "@/lib/contract/pin";
import { PartnerPortalError } from "@/lib/contract/errors";
import { assertPartnerSupabaseEnvironment } from "@/lib/contract/env";

/**
 * Local proposal seller_* workflows remain for isolated Docker proofs only.
 * Against shared staging/production Owner schema they must not run.
 */
export function assertLocalLegacySellerDomainAllowed(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
): void {
  // Runtime environment contract first (production only when explicitly production-mode).
  assertPartnerSupabaseEnvironment(url);

  if (!url) return;
  const remote =
    url.includes("supabase.co") || url.includes(STAGING_PROJECT_REF);
  if (remote) {
    throw new PartnerPortalError(
      "CONTRACT_SURFACE_UNAVAILABLE",
      "Local seller_profiles workflows are disabled against Owner RC2 staging; use partner_* surfaces/RPCs",
    );
  }
}
