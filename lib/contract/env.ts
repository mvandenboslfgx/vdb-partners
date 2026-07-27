import {
  CONTRACT_VERSION,
  PRODUCTION_PROJECT_REF,
  SCHEMA_VERSION,
  STAGING_PROJECT_REF,
} from "@/lib/contract/pin";

export class EnvironmentDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentDeniedError";
  }
}

export function extractSupabaseProjectRef(
  url: string | undefined | null,
): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(host);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export function assertNotProductionSupabaseUrl(
  url: string | undefined | null,
): void {
  if (!url) return;
  const lower = url.toLowerCase();
  if (lower.includes(PRODUCTION_PROJECT_REF)) {
    throw new EnvironmentDeniedError(
      `Production Supabase project ${PRODUCTION_PROJECT_REF} is denylisted`,
    );
  }
  const ref = extractSupabaseProjectRef(url);
  if (ref === PRODUCTION_PROJECT_REF) {
    throw new EnvironmentDeniedError(
      `Production Supabase project ${PRODUCTION_PROJECT_REF} is denylisted`,
    );
  }
}

export function assertStagingSupabaseUrl(
  url: string | undefined | null,
): string {
  assertNotProductionSupabaseUrl(url);
  if (!url) throw new EnvironmentDeniedError("Missing Supabase URL");
  const ref = extractSupabaseProjectRef(url);
  if (ref !== STAGING_PROJECT_REF && !url.includes(STAGING_PROJECT_REF)) {
    throw new EnvironmentDeniedError(
      `Expected staging project ${STAGING_PROJECT_REF}`,
    );
  }
  return STAGING_PROJECT_REF;
}

export function assertContractPins(env: NodeJS.ProcessEnv = process.env): void {
  const contract = env.BACKEND_CONTRACT_VERSION ?? env.VDB_BACKEND_CONTRACT;
  const schema = env.VDB_SCHEMA_VERSION ?? env.BACKEND_SCHEMA_VERSION;
  if (contract && contract !== CONTRACT_VERSION) {
    throw new EnvironmentDeniedError(
      `Contract pin mismatch: expected ${CONTRACT_VERSION}`,
    );
  }
  if (schema && schema !== SCHEMA_VERSION) {
    throw new EnvironmentDeniedError(
      `Schema pin mismatch: expected ${SCHEMA_VERSION}`,
    );
  }
}

export function resolveRuntimeSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function describeRuntimeEnvironment() {
  const url = resolveRuntimeSupabaseUrl();
  assertNotProductionSupabaseUrl(url);
  return {
    contractVersion: CONTRACT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    supabaseUrlHost: url ? new URL(url).host : null,
    projectRef: extractSupabaseProjectRef(url),
    isStaging: Boolean(url && url.includes(STAGING_PROJECT_REF)),
    isLocal: Boolean(
      url && (url.includes("127.0.0.1") || url.includes("localhost")),
    ),
    productionDenylisted: true as const,
    productionRef: PRODUCTION_PROJECT_REF,
  };
}
