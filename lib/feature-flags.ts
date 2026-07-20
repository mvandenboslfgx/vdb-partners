import { getEnv } from "@/lib/env";

export const featureFlagNames = [
  "seller_registration_enabled",
  "identity_verification_enabled",
  "mollie_payments_enabled",
  "manual_bank_payments_enabled",
  "cash_payouts_enabled",
  "bank_payouts_enabled",
  "marketing_library_enabled",
  "support_enabled",
  "international_registration_enabled",
] as const;

export type FeatureFlag = (typeof featureFlagNames)[number];
export type FeatureFlags = Record<FeatureFlag, boolean>;

function envDefaults(): FeatureFlags {
  const env = getEnv();
  return Object.fromEntries(featureFlagNames.map((key) => [key, Boolean(env[key])])) as FeatureFlags;
}

/** Environment-only view for startup and tests; all values default to false. */
export const featureFlags = envDefaults();

/** Database values override env defaults. Errors intentionally remain fail-closed. */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const defaults = envDefaults();
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { data, error } = await createAdminClient().from("feature_flags").select("key, enabled").in("key", featureFlagNames);
    if (error) return defaults;
    for (const row of data ?? []) {
      if (featureFlagNames.includes(row.key as FeatureFlag)) defaults[row.key as FeatureFlag] = row.enabled === true;
    }
  } catch {
    // Environment defaults are deliberately false unless explicitly enabled.
  }
  return defaults;
}

export async function isFeatureEnabled(flag: FeatureFlag) {
  return (await getFeatureFlags())[flag];
}
