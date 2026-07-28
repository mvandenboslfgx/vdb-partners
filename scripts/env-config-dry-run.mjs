/**
 * Production / preview environment contract dry-run (no secrets printed).
 * Exit 0 when pins + deployment↔Supabase contract hold for the given mode.
 *
 * Usage:
 *   node scripts/env-config-dry-run.mjs production
 *   node scripts/env-config-dry-run.mjs preview
 */
import {
  assertExpectedSupabaseEnvironment,
  resolveDeploymentEnvironment,
} from "../lib/contract/env.ts";
import {
  CONTRACT_VERSION,
  PRODUCTION_PROJECT_REF,
  SCHEMA_VERSION,
  STAGING_PROJECT_REF,
} from "../lib/contract/pin.ts";

const mode = process.argv[2];
if (mode !== "production" && mode !== "preview") {
  console.error("usage: node scripts/env-config-dry-run.mjs <production|preview>");
  process.exit(2);
}

const productionUrl = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;
const stagingUrl = `https://${STAGING_PROJECT_REF}.supabase.co`;

const scenarios =
  mode === "production"
    ? [
        {
          name: "production_ok",
          env: {
            VDB_DEPLOYMENT_ENVIRONMENT: "production",
            NEXT_PUBLIC_SUPABASE_URL: productionUrl,
            BACKEND_CONTRACT_VERSION: CONTRACT_VERSION,
            VDB_SCHEMA_VERSION: SCHEMA_VERSION,
          },
          expectPass: true,
        },
        {
          name: "production_blocks_staging",
          env: {
            VDB_DEPLOYMENT_ENVIRONMENT: "production",
            NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
          },
          expectPass: false,
        },
        {
          name: "production_blocks_missing_url",
          env: {
            VDB_DEPLOYMENT_ENVIRONMENT: "production",
            NEXT_PUBLIC_SUPABASE_URL: "",
          },
          expectPass: false,
        },
      ]
    : [
        {
          name: "preview_ok",
          env: {
            VDB_DEPLOYMENT_ENVIRONMENT: "preview",
            NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
            BACKEND_CONTRACT_VERSION: CONTRACT_VERSION,
            VDB_SCHEMA_VERSION: SCHEMA_VERSION,
          },
          expectPass: true,
        },
        {
          name: "preview_blocks_production",
          env: {
            VDB_DEPLOYMENT_ENVIRONMENT: "preview",
            NEXT_PUBLIC_SUPABASE_URL: productionUrl,
          },
          expectPass: false,
        },
      ];

let failed = 0;
for (const s of scenarios) {
  const deploymentEnvironment = resolveDeploymentEnvironment(s.env);
  let threw = false;
  let message = "";
  try {
    assertExpectedSupabaseEnvironment({
      deploymentEnvironment,
      actualSupabaseUrl: s.env.NEXT_PUBLIC_SUPABASE_URL || null,
      stagingProjectRef: STAGING_PROJECT_REF,
      productionProjectRef: PRODUCTION_PROJECT_REF,
    });
  } catch (e) {
    threw = true;
    message = e instanceof Error ? e.message : String(e);
  }
  const ok = s.expectPass ? !threw : threw;
  if (!ok) failed += 1;
  console.log(
    JSON.stringify({
      mode,
      scenario: s.name,
      deploymentEnvironment,
      expectPass: s.expectPass,
      passed: ok,
      blockedMessage: threw ? message.replace(/https?:\/\/\S+/g, "[url]") : null,
      contract: CONTRACT_VERSION,
      schema: SCHEMA_VERSION,
      expectedRef:
        mode === "production" ? PRODUCTION_PROJECT_REF : STAGING_PROJECT_REF,
    }),
  );
}

console.log(
  JSON.stringify({
    summary: mode,
    scenarios: scenarios.length,
    failed,
    exit: failed === 0 ? 0 : 1,
  }),
);
process.exit(failed === 0 ? 0 : 1);
