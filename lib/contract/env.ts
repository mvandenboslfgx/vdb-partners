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

export type DeploymentEnvironment =
  "production" | "preview" | "staging" | "development";

export type AssertExpectedSupabaseEnvironmentInput = {
  deploymentEnvironment: DeploymentEnvironment | string | null | undefined;
  actualSupabaseUrl: string | undefined | null;
  stagingProjectRef?: string;
  productionProjectRef?: string;
};

const KNOWN_ENVIRONMENTS = new Set<DeploymentEnvironment>([
  "production",
  "preview",
  "staging",
  "development",
]);

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

function normalizeDeploymentEnvironment(
  value: string | null | undefined,
): DeploymentEnvironment | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "local" || normalized === "test" || normalized === "dev") {
    return "development";
  }
  if (KNOWN_ENVIRONMENTS.has(normalized as DeploymentEnvironment)) {
    return normalized as DeploymentEnvironment;
  }
  return null;
}

/**
 * Resolves Partner Portal deployment environment.
 * Prefer explicit VDB_DEPLOYMENT_ENVIRONMENT / APP_ENV, then Vercel, then local defaults.
 */
export function resolveDeploymentEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): DeploymentEnvironment {
  const explicit = normalizeDeploymentEnvironment(
    env.VDB_DEPLOYMENT_ENVIRONMENT ?? env.APP_ENV,
  );
  if (env.VDB_DEPLOYMENT_ENVIRONMENT || env.APP_ENV) {
    if (!explicit) {
      throw new EnvironmentDeniedError(
        `Unknown deployment environment: ${env.VDB_DEPLOYMENT_ENVIRONMENT ?? env.APP_ENV}`,
      );
    }
    return explicit;
  }

  const vercel = normalizeDeploymentEnvironment(env.VERCEL_ENV);
  if (env.VERCEL_ENV) {
    if (!vercel) {
      throw new EnvironmentDeniedError(
        `Unknown Vercel environment: ${env.VERCEL_ENV}`,
      );
    }
    return vercel;
  }

  // Local `next build` / vitest / docker without Vercel context.
  if (!env.VERCEL) {
    return "development";
  }

  throw new EnvironmentDeniedError("Missing deployment environment");
}

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

/**
 * Fail-closed environment ↔ Supabase project-ref contract.
 * Does not print URLs beyond project-ref identity in errors.
 */
export function assertExpectedSupabaseEnvironment(
  input: AssertExpectedSupabaseEnvironmentInput,
): { deploymentEnvironment: DeploymentEnvironment; projectRef: string | null } {
  const stagingRef = input.stagingProjectRef ?? STAGING_PROJECT_REF;
  const productionRef = input.productionProjectRef ?? PRODUCTION_PROJECT_REF;

  const deploymentEnvironment = normalizeDeploymentEnvironment(
    input.deploymentEnvironment,
  );
  if (!input.deploymentEnvironment) {
    throw new EnvironmentDeniedError("Missing deployment environment");
  }
  if (!deploymentEnvironment) {
    throw new EnvironmentDeniedError(
      `Unknown deployment environment: ${String(input.deploymentEnvironment)}`,
    );
  }

  const url = input.actualSupabaseUrl;
  if (!url) {
    if (deploymentEnvironment === "development") {
      return { deploymentEnvironment, projectRef: null };
    }
    throw new EnvironmentDeniedError("Missing Supabase URL");
  }

  let parsedOk = true;
  try {
    void new URL(url);
  } catch {
    parsedOk = false;
  }
  if (!parsedOk) {
    throw new EnvironmentDeniedError("Invalid Supabase URL");
  }

  const projectRef = extractSupabaseProjectRef(url);
  const local = isLocalSupabaseUrl(url);

  switch (deploymentEnvironment) {
    case "production": {
      if (projectRef !== productionRef) {
        throw new EnvironmentDeniedError(
          `Production requires Supabase project ${productionRef}`,
        );
      }
      if (url.toLowerCase().includes(stagingRef)) {
        throw new EnvironmentDeniedError(
          "Staging Supabase project refused in production",
        );
      }
      return { deploymentEnvironment, projectRef };
    }
    case "preview":
    case "staging": {
      if (
        projectRef === productionRef ||
        url.toLowerCase().includes(productionRef)
      ) {
        throw new EnvironmentDeniedError(
          `Production Supabase project ${productionRef} refused in ${deploymentEnvironment}`,
        );
      }
      if (projectRef !== stagingRef && !url.includes(stagingRef)) {
        throw new EnvironmentDeniedError(
          `${deploymentEnvironment} requires Supabase project ${stagingRef}`,
        );
      }
      return { deploymentEnvironment, projectRef: stagingRef };
    }
    case "development": {
      if (
        projectRef === productionRef ||
        url.toLowerCase().includes(productionRef)
      ) {
        throw new EnvironmentDeniedError(
          `Production Supabase project ${productionRef} refused in development`,
        );
      }
      if (local) {
        return { deploymentEnvironment, projectRef: null };
      }
      if (projectRef === stagingRef || url.includes(stagingRef)) {
        return { deploymentEnvironment, projectRef: stagingRef };
      }
      throw new EnvironmentDeniedError(
        "Development allows local or staging Supabase only",
      );
    }
    default:
      throw new EnvironmentDeniedError("Unknown deployment environment");
  }
}

/** Runtime guard used by middleware / auth / env parsing. */
export function assertPartnerSupabaseEnvironment(
  url: string | undefined | null = process.env.NEXT_PUBLIC_SUPABASE_URL,
  env: NodeJS.ProcessEnv = process.env,
): void {
  assertExpectedSupabaseEnvironment({
    deploymentEnvironment: resolveDeploymentEnvironment(env),
    actualSupabaseUrl: url,
    stagingProjectRef: STAGING_PROJECT_REF,
    productionProjectRef: PRODUCTION_PROJECT_REF,
  });
}

/**
 * @deprecated Use assertPartnerSupabaseEnvironment / assertExpectedSupabaseEnvironment.
 * Kept as a development-mode helper that refuses the production project ref.
 */
export function assertNotProductionSupabaseUrl(
  url: string | undefined | null,
): void {
  assertExpectedSupabaseEnvironment({
    deploymentEnvironment: "development",
    actualSupabaseUrl: url,
    stagingProjectRef: STAGING_PROJECT_REF,
    productionProjectRef: PRODUCTION_PROJECT_REF,
  });
}

export function assertStagingSupabaseUrl(
  url: string | undefined | null,
): string {
  assertExpectedSupabaseEnvironment({
    deploymentEnvironment: "staging",
    actualSupabaseUrl: url,
    stagingProjectRef: STAGING_PROJECT_REF,
    productionProjectRef: PRODUCTION_PROJECT_REF,
  });
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

export function describeRuntimeEnvironment(
  env: NodeJS.ProcessEnv = process.env,
) {
  const url = resolveRuntimeSupabaseUrl();
  const deploymentEnvironment = resolveDeploymentEnvironment(env);
  const checked = assertExpectedSupabaseEnvironment({
    deploymentEnvironment,
    actualSupabaseUrl: url,
  });
  return {
    contractVersion: CONTRACT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    deploymentEnvironment: checked.deploymentEnvironment,
    supabaseUrlHost: url ? new URL(url).host : null,
    projectRef: checked.projectRef,
    isStaging: checked.projectRef === STAGING_PROJECT_REF,
    isProduction: checked.projectRef === PRODUCTION_PROJECT_REF,
    isLocal: Boolean(url && isLocalSupabaseUrl(url)),
    productionRef: PRODUCTION_PROJECT_REF,
    stagingRef: STAGING_PROJECT_REF,
  };
}
