import { env } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { VerificationProvider } from "@/lib/verification/types";

/** Production must provide a real, compliant identity-verification provider. */
export async function requireVerificationProvider(): Promise<VerificationProvider> {
  if (!(await isFeatureEnabled("identity_verification_enabled")) || !env.IDENTITY_PROVIDER_API_KEY) throw new Error("Identity verification is disabled or not configured");
  throw new Error("No production identity verification provider has been configured");
}
