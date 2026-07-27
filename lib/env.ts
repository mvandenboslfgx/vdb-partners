import { z } from "zod";
import { assertNotProductionSupabaseUrl } from "@/lib/contract/env";

const booleanFromEnv = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");
const optionalUrl = z.string().url().optional();

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_MAIN_SITE_URL: optionalUrl,
  MAIN_SITE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_DB_URL: z.string().min(1).optional(),
  MOLLIE_API_KEY: z.string().min(1).optional(),
  MOLLIE_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  IDENTITY_PROVIDER: z.string().min(1).optional(),
  IDENTITY_PROVIDER_API_KEY: z.string().min(1).optional(),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  SENTRY_DSN: optionalUrl,
  FORCE_ENV_VALIDATION: booleanFromEnv,
  EMAILS_REQUIRED: booleanFromEnv,
  seller_registration_enabled: booleanFromEnv,
  identity_verification_enabled: booleanFromEnv,
  mollie_payments_enabled: booleanFromEnv,
  manual_bank_payments_enabled: booleanFromEnv,
  cash_payouts_enabled: booleanFromEnv,
  bank_payouts_enabled: booleanFromEnv,
  marketing_library_enabled: booleanFromEnv,
  support_enabled: booleanFromEnv,
  international_registration_enabled: booleanFromEnv,
});

export type Env = z.infer<typeof schema> & { MAIN_SITE_URL: string };
const requiredInProduction = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENCRYPTION_KEY",
] as const;

function shouldEnforce(env: z.infer<typeof schema>) {
  return (
    env.FORCE_ENV_VALIDATION ||
    (env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production")
  );
}

/** Parses on use so `next build` can evaluate modules without deployment secrets. */
export function getEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success)
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  const env = {
    ...parsed.data,
    MAIN_SITE_URL:
      parsed.data.NEXT_PUBLIC_MAIN_SITE_URL ??
      parsed.data.MAIN_SITE_URL ??
      parsed.data.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
  };
  assertNotProductionSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  if (shouldEnforce(env)) {
    for (const key of requiredInProduction) {
      if (!env[key])
        throw new Error(
          `Missing required production environment variable: ${key}`,
        );
    }
    if (env.mollie_payments_enabled && !env.MOLLIE_API_KEY)
      throw new Error("mollie_payments_enabled requires MOLLIE_API_KEY");
    if (env.identity_verification_enabled && !env.IDENTITY_PROVIDER_API_KEY) {
      throw new Error(
        "identity_verification_enabled requires IDENTITY_PROVIDER_API_KEY",
      );
    }
  }
  return env;
}

/** Backwards-compatible lazy proxy; accessing a value performs runtime validation. */
export const env: Env = new Proxy({} as Env, {
  get: (_target, property) => getEnv()[property as keyof Env],
});
