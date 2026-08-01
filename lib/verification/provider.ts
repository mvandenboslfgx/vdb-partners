import { env } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { VerificationProvider } from "@/lib/verification/types";

/**
 * V1 Partners: no external IDV provider (no Veriff/Sumsub/Onfido, no camera IDV).
 * This stub stays fail-closed. Do not wire into product UI.
 * QUARANTINED from the active partner onboarding path.
 */
export async function requireVerificationProvider(): Promise<VerificationProvider> {
  if (
    !(await isFeatureEnabled("identity_verification_enabled")) ||
    !env.IDENTITY_PROVIDER_API_KEY
  ) {
    throw new Error(
      "Identity verification provider is disabled for Partners v1 (fail-closed)",
    );
  }
  throw new Error(
    "No production identity verification provider is authorized for Partners v1",
  );
}
