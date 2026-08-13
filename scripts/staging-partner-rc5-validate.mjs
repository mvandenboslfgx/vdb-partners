/**
 * Staging-only RC5 partner validation — qzekuvmgfekzsowdecyk only.
 * Never prints secrets. Uses Owner-provisioned SUSPENDED_PARTNER_RC5 vault fixture.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const STAGING = "qzekuvmgfekzsowdecyk";
const PROD = "nhsrdnjfsxfikfbdmdfj";
const CONTRACT = "vdb-backend-contract@0.2.0-rc.5";
const SCHEMA = "2026.07.29.partner-identity-directory-rc5";
const EXPECTED_FINGERPRINT = "099764f54e18";
const EXPECTED_FIXTURE_KIND = "SUSPENDED_PARTNER_RC5";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const evidenceDir = path.join(
  root,
  "docs",
  "evidence",
  "partners-rc5-integration-2026-07-29",
);
const artifactsDir = path.join(
  root,
  "docs",
  "artifacts",
  "partners-rc5-integration-2026-07-29",
);
const preflightRoot = path.resolve(
  root,
  "..",
  "vdbdigital-staging-rc2-preflight",
);
const vaultClient = path.join(
  preflightRoot,
  "docs",
  "evidence",
  "staging-ui-device",
  ".vault",
  "staging-client.env",
);
const vaultPw = path.join(
  preflightRoot,
  "docs",
  "evidence",
  "staging-cross-repo",
  ".vault",
  "staging-rc2-xrepo-passwords.json",
);
const suspendedVault =
  "C:/Users/XXX/.vdb-vault/partner-staging-suspended-rc5.env";

function loadEnvFile(p) {
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function maskEmail(email) {
  if (!email?.includes("@")) return "***";
  const [u, d] = email.split("@");
  return `${u.slice(0, 2)}***@${d}`;
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex")
    .slice(0, 12);
}

function assertStaging(url) {
  if (!url.includes(STAGING)) throw new Error(`ref_not_staging:${url}`);
  if (url.includes(PROD)) throw new Error("production_denylist");
}

function isForbidden(msg) {
  const m = String(msg || "").toUpperCase();
  return (
    m.includes("FORBIDDEN") ||
    m.includes("NOT AUTHORIZED") ||
    m.includes("PERMISSION") ||
    m.includes("CAPABILITY") ||
    m.includes("SUSPENDED") ||
    m.includes("DENIED") ||
    m.includes("JWT") ||
    m.includes("RLS") ||
    m.includes("POLICY") ||
    m.includes("PARTNER_STATUS") ||
    m.includes("NOT ACTIVE") ||
    m.includes("P0001") ||
    m.includes("42501")
  );
}

const results = {
  at: new Date().toISOString(),
  contract: CONTRACT,
  schemaVersion: SCHEMA,
  stagingRef: STAGING,
  productionRefDenied: PROD,
  productionUntouched: true,
  cases: [],
  blockers: [],
};

function redactDetail(detail) {
  if (detail == null || typeof detail !== "object") return detail;
  const clone = JSON.parse(JSON.stringify(detail));
  const scrub = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (
        (k === "partner_id" || k === "id" || k === "user_id") &&
        typeof v === "string" &&
        v.length > 8
      ) {
        obj[k] = `${v.slice(0, 8)}…`;
      } else if (typeof v === "object") {
        scrub(v);
      }
    }
  };
  scrub(clone);
  return clone;
}

function rec(name, ok, detail) {
  const safe = redactDetail(detail);
  results.cases.push({ name, ok, detail: safe });
  if (!ok) results.blockers.push({ name, detail: safe });
}

async function signIn(url, anon, email, password) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) throw new Error(error?.message || "login_failed");
  return { client, user: data.user, session: data.session };
}

async function probeCommercial(client, userId) {
  const { data: partner, error: pErr } = await client
    .from("partner_profiles")
    .select(
      "id,status,partner_type,payout_eligible,payout_profile_status,activation_block_codes,legacy_activation_grandfathered,type_classification_status",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (pErr) throw pErr;

  let checklist = null;
  let checklistError = null;
  if (partner?.id) {
    const { data, error } = await client.rpc("partner_activation_checklist", {
      p_partner_id: partner.id,
    });
    checklist = data;
    checklistError = error?.message ?? null;
  }

  const catalog = await client.rpc("list_partner_catalog");
  const lead = await client.rpc("create_partner_lead", {
    p_contact_name: "RC5 Synthetic Deny",
    p_contact_email: "rc5-deny@example.test",
    p_dedupe_key: `rc5-deny-${userId.slice(0, 8)}-${Date.now()}`,
    p_company: null,
    p_phone: null,
    p_message: "capability probe",
    p_code: null,
    p_product_id: "00000000-0000-4000-8000-000000000001",
  });

  // Staff-only sale confirm — partners (incl. suspended) must be denied.
  const sale = await client.rpc("confirm_partner_sale", {
    p_lead_id: "00000000-0000-4000-8000-000000000002",
    p_gross_amount_cents: 10000,
    p_idempotency_key: `rc5-sale-deny-${Date.now()}`,
  });

  // Partner payout requires ACTIVE + payout_eligible — suspended must FORBIDDEN.
  const payout = await client.rpc("request_partner_payout", {
    p_amount_cents: 100,
    p_idempotency_key: `rc5-payout-deny-${Date.now()}`,
    p_currency: "EUR",
  });

  const financial = await client.rpc("partner_financial_summary");

  const { data: internalRows } = await client
    .from("portal_support_replies")
    .select("id")
    .eq("is_internal", true)
    .limit(1);

  const note = await client.rpc("add_portal_support_internal_note", {
    p_ticket_id: "5ee3d66a-9ab3-4d80-8137-349d3ce7cdad",
    p_body: "partner-should-not-write-internal",
  });

  // Cross-partner probe: attempt to read another partner profile by guessing is blocked by RLS.
  const { data: otherPartners, error: otherErr } = await client
    .from("partner_profiles")
    .select("id,status")
    .neq("user_id", userId)
    .limit(5);

  return {
    partner,
    checklist,
    checklistError,
    catalogCount: Array.isArray(catalog.data) ? catalog.data.length : null,
    catalogError: catalog.error?.message ?? null,
    leadError: lead.error?.message ?? null,
    leadId: lead.data ?? null,
    saleError: sale.error?.message ?? null,
    saleData: sale.data ?? null,
    payoutError: payout.error?.message ?? null,
    payoutData: payout.data ?? null,
    financialError: financial.error?.message ?? null,
    financialData: financial.data ?? null,
    internalNotesVisible: (internalRows ?? []).length > 0,
    internalNoteRpcError: note.error?.message ?? null,
    otherPartnerRows: (otherPartners ?? []).length,
    otherPartnerError: otherErr?.message ?? null,
  };
}

async function runSuspendedMatrix(url, anon) {
  if (!fs.existsSync(suspendedVault)) {
    return {
      ok: false,
      detail: { error: "vault_missing", vaultPath: suspendedVault },
    };
  }
  const vault = loadEnvFile(suspendedVault);
  if (vault.VDB_STAGING_PROJECT_REF !== STAGING) {
    throw new Error("suspended_vault_ref_mismatch");
  }
  if ((vault.VDB_STAGING_SUPABASE_URL || "").includes(PROD)) {
    throw new Error("suspended_vault_production_ref");
  }
  assertStaging(vault.VDB_STAGING_SUPABASE_URL || url);

  const email = vault.VDB_STAGING_SUSPENDED_PARTNER_EMAIL;
  const password = vault.VDB_STAGING_SUSPENDED_PARTNER_PASSWORD;
  const kind = vault.VDB_STAGING_SUSPENDED_FIXTURE_KIND;
  const fp = vault.VDB_STAGING_SUSPENDED_FINGERPRINT;
  if (!email || !password) {
    return { ok: false, detail: { error: "vault_credentials_missing" } };
  }

  // Login #1
  const first = await signIn(url, anon, email, password);
  const probe1 = await probeCommercial(first.client, first.user.id);
  const session1 = await first.client.auth.getSession();
  await first.client.auth.signOut();

  // Login #2 (session restore / re-login)
  const second = await signIn(url, anon, email, password);
  const probe2 = await probeCommercial(second.client, second.user.id);
  await second.client.auth.signOut();

  const statusOk =
    probe1.partner?.status === "SUSPENDED" &&
    probe2.partner?.status === "SUSPENDED";
  const payoutEligibleFalse =
    probe1.partner?.payout_eligible === false &&
    probe2.partner?.payout_eligible === false;
  const catalogDenied =
    Boolean(probe1.catalogError) ||
    probe1.catalogCount === 0 ||
    isForbidden(probe1.catalogError);
  const leadDenied = Boolean(probe1.leadError) && probe1.leadId == null;
  const saleDenied = Boolean(probe1.saleError) && probe1.saleData == null;
  const payoutDenied = Boolean(probe1.payoutError) && probe1.payoutData == null;
  const noInternal = !probe1.internalNotesVisible;
  const internalRpcDenied = Boolean(probe1.internalNoteRpcError);
  const crossPartnerDeny = probe1.otherPartnerRows === 0;
  const fingerprintOk = fp === EXPECTED_FINGERPRINT;
  const kindOk = kind === EXPECTED_FIXTURE_KIND;
  const partnerIdMasked = String(vault.VDB_STAGING_SUSPENDED_PARTNER_ID || "")
    .slice(0, 8)
    .concat("…");

  const ok =
    statusOk &&
    payoutEligibleFalse &&
    catalogDenied &&
    leadDenied &&
    saleDenied &&
    payoutDenied &&
    noInternal &&
    internalRpcDenied &&
    crossPartnerDeny &&
    fingerprintOk &&
    kindOk &&
    Boolean(session1.data?.session);

  return {
    ok,
    detail: {
      source: "owner_suspended_vault",
      vaultPath: suspendedVault,
      fixtureKind: kind,
      fingerprint: fp,
      partnerIdMasked,
      emailMasked: maskEmail(email),
      userFingerprint: fingerprint(first.user.id),
      partnerFingerprint: fingerprint(probe1.partner?.id ?? "none"),
      status: probe1.partner?.status ?? null,
      statusRelogin: probe2.partner?.status ?? null,
      payoutEligible: probe1.partner?.payout_eligible ?? null,
      sessionPresentBeforeLogout: Boolean(session1.data?.session),
      catalogCount: probe1.catalogCount,
      catalogError: probe1.catalogError,
      leadError: probe1.leadError,
      saleError: probe1.saleError,
      payoutError: probe1.payoutError,
      financialError: probe1.financialError,
      checklistError: probe1.checklistError,
      checklist: probe1.checklist,
      internalNotesVisible: probe1.internalNotesVisible,
      internalNoteRpcError: probe1.internalNoteRpcError,
      otherPartnerRows: probe1.otherPartnerRows,
      checks: {
        statusOk,
        payoutEligibleFalse,
        catalogDenied,
        leadDenied,
        saleDenied,
        payoutDenied,
        noInternal,
        internalRpcDenied,
        crossPartnerDeny,
        fingerprintOk,
        kindOk,
        reLoginStillSuspended: probe2.partner?.status === "SUSPENDED",
      },
    },
  };
}

async function runAccountSwitch(
  url,
  anon,
  passwords,
  activeEmail,
  suspendedVaultEnv,
) {
  const activePw = passwords[activeEmail];
  const suspendedEmail = suspendedVaultEnv.VDB_STAGING_SUSPENDED_PARTNER_EMAIL;
  const suspendedPw = suspendedVaultEnv.VDB_STAGING_SUSPENDED_PARTNER_PASSWORD;
  if (!activePw || !suspendedEmail || !suspendedPw) {
    return { ok: false, detail: { error: "missing_switch_credentials" } };
  }

  // ACTIVE → logout → SUSPENDED
  const a1 = await signIn(url, anon, activeEmail, activePw);
  const a1Probe = await probeCommercial(a1.client, a1.user.id);
  const a1PartnerId = a1Probe.partner?.id ?? null;
  const a1Catalog = a1Probe.catalogCount;
  await a1.client.auth.signOut();
  const a1After = await a1.client.auth.getSession();

  const s1 = await signIn(url, anon, suspendedEmail, suspendedPw);
  const s1Probe = await probeCommercial(s1.client, s1.user.id);
  const noStaleActive =
    s1Probe.partner?.status === "SUSPENDED" &&
    s1Probe.partner?.id !== a1PartnerId &&
    (Boolean(s1Probe.catalogError) || s1Probe.catalogCount === 0);
  await s1.client.auth.signOut();

  // SUSPENDED → logout → ACTIVE
  const s2 = await signIn(url, anon, suspendedEmail, suspendedPw);
  await s2.client.auth.signOut();
  const a2 = await signIn(url, anon, activeEmail, activePw);
  const a2Probe = await probeCommercial(a2.client, a2.user.id);
  const activeRestored =
    a2Probe.partner?.status === "ACTIVE" &&
    typeof a2Probe.catalogCount === "number" &&
    a2Probe.catalogCount >= 1 &&
    a2Probe.partner?.id === a1PartnerId;
  await a2.client.auth.signOut();

  // Partner A → Partner B
  const bEmail = "staging+part_b@example.test";
  const bPw = passwords[bEmail];
  const a3 = await signIn(url, anon, activeEmail, activePw);
  const a3Id = (await probeCommercial(a3.client, a3.user.id)).partner?.id;
  await a3.client.auth.signOut();
  const b1 = await signIn(url, anon, bEmail, bPw);
  const bProbe = await probeCommercial(b1.client, b1.user.id);
  const crossOk =
    bProbe.partner?.status === "ACTIVE" &&
    bProbe.partner?.id !== a3Id &&
    bProbe.otherPartnerRows === 0;
  await b1.client.auth.signOut();

  const ok =
    a1Probe.partner?.status === "ACTIVE" &&
    !a1After.data?.session &&
    noStaleActive &&
    activeRestored &&
    crossOk;

  return {
    ok,
    detail: {
      activeBeforeStatus: a1Probe.partner?.status ?? null,
      activeCatalogBefore: a1Catalog,
      sessionClearedAfterLogout: !a1After.data?.session,
      suspendedAfterSwitch: s1Probe.partner?.status ?? null,
      suspendedCatalogCount: s1Probe.catalogCount,
      suspendedCatalogError: s1Probe.catalogError,
      activeRestoredStatus: a2Probe.partner?.status ?? null,
      activeRestoredCatalog: a2Probe.catalogCount,
      partnerAtoBIsolated: crossOk,
      partnerBOtherRows: bProbe.otherPartnerRows,
    },
  };
}

async function main() {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(artifactsDir, { recursive: true });

  const clientEnv = loadEnvFile(vaultClient);
  const url = clientEnv.STAGING_SUPABASE_URL;
  const anon = clientEnv.STAGING_SUPABASE_ANON_KEY;
  assertStaging(url);
  if ((clientEnv.STAGING_SUPABASE_PROJECT_REF || "") !== STAGING) {
    throw new Error("staging_ref_mismatch");
  }
  rec("env_ref_guard", true, STAGING);
  rec("local_contract_pin", true, { contract: CONTRACT, schema: SCHEMA });
  rec("production_denylist", !url.includes(PROD), { productionRef: PROD });

  const passwords = JSON.parse(fs.readFileSync(vaultPw, "utf8"));
  const accounts = {
    partner_a: "staging+part_a@example.test",
    partner_b: "staging+part_b@example.test",
    partner_pending: "staging+part_pending@example.test",
    customer_a: "staging+cust_a@example.test",
    staff: "staging+staff_s@example.test",
    admin: "staging+admin_a@example.test",
  };

  for (const [alias, email] of Object.entries(accounts)) {
    const password = passwords[email];
    if (!password) {
      rec(`login_${alias}`, false, "password_missing");
      continue;
    }
    try {
      const { client, user } = await signIn(url, anon, email, password);
      const probe = await probeCommercial(client, user.id);
      const expect = {
        partner_a: "ACTIVE",
        partner_b: "ACTIVE",
        partner_pending: "PENDING",
        customer_a: null,
        staff: null,
        admin: null,
      }[alias];

      const statusOk =
        alias === "customer_a" || alias === "staff" || alias === "admin"
          ? probe.partner == null
          : probe.partner?.status === expect;

      let capabilityOk = true;
      if (alias === "partner_a" || alias === "partner_b") {
        capabilityOk =
          typeof probe.catalogCount === "number" &&
          probe.catalogCount >= 1 &&
          !probe.internalNotesVisible &&
          Boolean(probe.internalNoteRpcError);
      }
      if (alias === "partner_pending") {
        capabilityOk =
          (Boolean(probe.leadError) || probe.leadId == null) &&
          (Boolean(probe.catalogError) ||
            probe.catalogCount === 0 ||
            isForbidden(probe.catalogError));
      }
      if (alias === "customer_a") {
        capabilityOk =
          probe.partner == null &&
          (Boolean(probe.catalogError) ||
            probe.catalogCount === 0 ||
            probe.catalogCount == null) &&
          Boolean(probe.leadError);
      }

      rec(`login_${alias}`, statusOk && capabilityOk, {
        emailMasked: maskEmail(email),
        userFingerprint: fingerprint(user.id),
        partnerStatus: probe.partner?.status ?? null,
        partnerType: probe.partner?.partner_type ?? null,
        catalogCount: probe.catalogCount,
        catalogError: probe.catalogError,
        leadError: probe.leadError,
        saleError: probe.saleError,
        payoutError: probe.payoutError,
        checklistError: probe.checklistError,
        checklistSchema:
          probe.checklist?.schemaVersion ??
          probe.checklist?.schema_version ??
          null,
        checklist: probe.checklist,
        internalNotesVisible: probe.internalNotesVisible,
        internalNoteRpcError: probe.internalNoteRpcError,
        otherPartnerRows: probe.otherPartnerRows,
      });

      if (alias === "partner_a" && typeof probe.catalogCount === "number") {
        rec("catalog_product_count", probe.catalogCount === 11, {
          count: probe.catalogCount,
          expected: 11,
        });
      }

      await client.auth.signOut();
    } catch (e) {
      rec(`login_${alias}`, false, String(e.message || e));
    }
  }

  // Suspended fixture matrix
  try {
    const suspended = await runSuspendedMatrix(url, anon);
    rec("suspended_fixture", suspended.ok, suspended.detail);
    if (suspended.ok) {
      rec("suspended_login", true, {
        status: suspended.detail.status,
        fingerprint: suspended.detail.fingerprint,
      });
      rec("suspended_relogin", suspended.detail.checks.reLoginStillSuspended, {
        statusRelogin: suspended.detail.statusRelogin,
      });
      rec("suspended_catalog_deny", suspended.detail.checks.catalogDenied, {
        catalogCount: suspended.detail.catalogCount,
        catalogError: suspended.detail.catalogError,
      });
      rec("suspended_lead_deny", suspended.detail.checks.leadDenied, {
        leadError: suspended.detail.leadError,
      });
      rec("suspended_sale_deny", suspended.detail.checks.saleDenied, {
        saleError: suspended.detail.saleError,
      });
      rec("suspended_payout_deny", suspended.detail.checks.payoutDenied, {
        payoutError: suspended.detail.payoutError,
      });
      rec("suspended_support_no_internal", suspended.detail.checks.noInternal, {
        internalNotesVisible: suspended.detail.internalNotesVisible,
        internalNoteRpcError: suspended.detail.internalNoteRpcError,
      });
      rec(
        "suspended_cross_partner_deny",
        suspended.detail.checks.crossPartnerDeny,
        { otherPartnerRows: suspended.detail.otherPartnerRows },
      );
    }
  } catch (e) {
    rec("suspended_fixture", false, String(e.message || e));
  }

  // Account / cache isolation
  try {
    const vault = loadEnvFile(suspendedVault);
    const switchResult = await runAccountSwitch(
      url,
      anon,
      passwords,
      accounts.partner_a,
      vault,
    );
    rec("account_session_isolation", switchResult.ok, switchResult.detail);
  } catch (e) {
    rec("account_session_isolation", false, String(e.message || e));
  }

  // Anon deny
  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonLeads = await anonClient
    .from("partner_leads")
    .select("id")
    .limit(1);
  const anonCatalog = await anonClient.rpc("list_partner_catalog");
  rec(
    "anon_partner_leads_deny",
    Boolean(anonLeads.error) || (anonLeads.data ?? []).length === 0,
    {
      error: anonLeads.error?.message ?? null,
      rows: (anonLeads.data ?? []).length,
    },
  );
  rec(
    "anon_catalog_deny",
    Boolean(anonCatalog.error) ||
      !Array.isArray(anonCatalog.data) ||
      anonCatalog.data.length === 0,
    {
      error: anonCatalog.error?.message ?? null,
      count: Array.isArray(anonCatalog.data) ? anonCatalog.data.length : null,
    },
  );

  results.pass = results.blockers.length === 0;
  const raw = JSON.stringify(results, null, 2);
  fs.writeFileSync(path.join(evidenceDir, "staging-matrix-raw.json"), raw);
  fs.writeFileSync(path.join(artifactsDir, "staging-matrix-raw.json"), raw);
  console.log(
    JSON.stringify(
      {
        pass: results.pass,
        cases: results.cases.length,
        blockers: results.blockers.map((b) => b.name),
        okCases: results.cases.filter((c) => c.ok).map((c) => c.name),
      },
      null,
      2,
    ),
  );
  process.exit(results.pass ? 0 : 2);
}

main().catch((e) => {
  console.error(String(e && e.stack ? e.stack : e));
  process.exit(1);
});
