import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertLocalLegacySellerDomainAllowed } from "@/lib/contract/local-legacy";

/**
 * Deployment-mode keys that resolveDeploymentEnvironment / URL defaults read.
 * Unit tests must own these explicitly — never inherit shell/.env.local staging.
 */
const ENV_KEYS = [
  "VDB_DEPLOYMENT_ENVIRONMENT",
  "APP_ENV",
  "VERCEL_ENV",
  "VERCEL",
  "NEXT_PUBLIC_SUPABASE_URL",
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

describe("local legacy seller domain gate", () => {
  const original: Partial<Record<EnvKey, string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
    // Explicit local unit mode — fail-closed gate still blocks remote seller_* URLs.
    process.env.APP_ENV = "development";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = original[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("allows local docker URLs", () => {
    expect(() =>
      assertLocalLegacySellerDomainAllowed("http://127.0.0.1:54421"),
    ).not.toThrow();
  });

  it("blocks staging and production remote URLs for seller_* workflows", () => {
    expect(() =>
      assertLocalLegacySellerDomainAllowed(
        "https://qzekuvmgfekzsowdecyk.supabase.co",
      ),
    ).toThrow(/disabled against Owner RC2/);
    expect(() =>
      assertLocalLegacySellerDomainAllowed(
        "https://nhsrdnjfsxfikfbdmdfj.supabase.co",
      ),
    ).toThrow(/refused in development|disabled against Owner RC2/);
  });
});
