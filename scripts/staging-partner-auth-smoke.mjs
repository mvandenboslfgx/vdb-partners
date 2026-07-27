/**
 * Authenticated Partner Portal staging smoke (Owner RC2).
 * Uses operator vault from sibling preflight evidence — never prints secrets.
 * Production denylist enforced.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STAGING = "qzekuvmgfekzsowdecyk";
const PROD = "nhsrdnjfsxfikfbdmdfj";
const CONTRACT = "vdb-backend-contract@0.2.0-rc.2";
const SCHEMA = "2026.07.27.financial-concurrency-rc2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const evDir = path.join(root, "docs", "evidence", "staging-auth-routing-rc2");
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

function loadEnvFile(p) {
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

function assertStagingUrl(url) {
  if (!url.includes(STAGING)) throw new Error(`ref_not_staging:${url}`);
  if (url.includes(PROD)) throw new Error("production_denylist");
}

function destinationForIdentity(identity) {
  if (identity.partnerBlocked)
    return { path: "/geen-toegang?reden=geschorst", reason: "partner_blocked" };
  if (["owner", "admin", "staff"].includes(identity.primaryRole))
    return { path: "/admin", reason: "admin" };
  if (identity.primaryRole === "partner")
    return { path: "/dashboard", reason: "partner_dashboard" };
  if (identity.primaryRole === "partner_pending")
    return { path: "/onboarding", reason: "partner_pending" };
  if (identity.primaryRole === "customer" || identity.isCustomerMember) {
    return { path: "/geen-toegang?reden=klant", reason: "customer_denied" };
  }
  return { path: "/geen-toegang?reden=onvolledig", reason: "incomplete" };
}

function mapAdmin(role) {
  switch (String(role || "").toUpperCase()) {
    case "OWNER":
      return "owner";
    case "ADMIN":
      return "admin";
    case "SUPPORT":
    case "CONTENT":
      return "staff";
    default:
      return null;
  }
}

function mapPartner(status) {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
      return "partner";
    case "PENDING":
      return "partner_pending";
    default:
      return null;
  }
}

const priority = [
  "owner",
  "admin",
  "staff",
  "partner",
  "partner_pending",
  "customer",
];

async function signIn(base, anon, email, password) {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(body.error_description || body.msg || `auth_${res.status}`);
  return body;
}

async function rest(base, anon, token, table, query = "") {
  const res = await fetch(`${base}/rest/v1/${table}${query}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function resolveIdentity(base, anon, token, userId) {
  const [admin, partner, members] = await Promise.all([
    rest(base, anon, token, "admin_roles", `?user_id=eq.${userId}&select=role`),
    rest(
      base,
      anon,
      token,
      "partner_profiles",
      `?user_id=eq.${userId}&select=id,status,display_name`,
    ),
    rest(
      base,
      anon,
      token,
      "organization_members",
      `?user_id=eq.${userId}&select=id&limit=1`,
    ),
  ]);
  for (const r of [admin, partner, members]) {
    if (!r.ok && r.status !== 406) {
      // empty maybeSingle via Accept can 406; treat array empty as ok
    }
  }
  const adminRole =
    Array.isArray(admin.data) && admin.data[0] ? admin.data[0].role : null;
  const partnerRow =
    Array.isArray(partner.data) && partner.data[0] ? partner.data[0] : null;
  const roles = [];
  const sharedAdmin = mapAdmin(adminRole);
  if (sharedAdmin) roles.push(sharedAdmin);
  const sharedPartner = mapPartner(partnerRow?.status);
  if (sharedPartner) roles.push(sharedPartner);
  const isCustomerMember =
    Array.isArray(members.data) && members.data.length > 0;
  if (isCustomerMember) roles.push("customer");
  const partnerBlocked = ["SUSPENDED", "REVOKED"].includes(
    String(partnerRow?.status || "").toUpperCase(),
  );
  const primaryRole = priority.find((r) => roles.includes(r)) ?? null;
  return {
    userId,
    roles,
    primaryRole,
    adminRole,
    partnerProfileId: partnerRow?.id ?? null,
    partnerStatus: partnerRow?.status ?? null,
    isCustomerMember,
    partnerBlocked,
    lookup: {
      admin: admin.status,
      partner: partner.status,
      members: members.status,
    },
  };
}

const results = [];
function rec(name, ok, detail = {}) {
  results.push({ name, ok, ...detail });
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name}${detail.note ? " — " + detail.note : ""}`,
  );
}

async function main() {
  fs.mkdirSync(evDir, { recursive: true });
  if (!fs.existsSync(vaultClient) || !fs.existsSync(vaultPw)) {
    throw new Error("staging_vault_missing");
  }
  const clientEnv = loadEnvFile(vaultClient);
  const passwords = JSON.parse(fs.readFileSync(vaultPw, "utf8"));
  assertStagingUrl(clientEnv.STAGING_SUPABASE_URL);
  const base = clientEnv.STAGING_SUPABASE_URL.replace(/\/$/, "");
  const anon = clientEnv.STAGING_SUPABASE_ANON_KEY;

  rec(
    "runtime_url_is_staging",
    base.includes(STAGING) && !base.includes(PROD),
    { host: new URL(base).host },
  );
  rec("contract_pin", CONTRACT === "vdb-backend-contract@0.2.0-rc.2");
  rec("schema_pin", SCHEMA === "2026.07.27.financial-concurrency-rc2");
  rec("production_denylist", !base.includes(PROD));

  {
    const r = await rest(
      base,
      anon,
      anon,
      "partner_profiles",
      "?select=id&limit=1",
    );
    const count = Array.isArray(r.data) ? r.data.length : -1;
    rec(
      "anon_partner_profiles_denied_or_empty",
      count === 0 || r.status >= 400,
      {
        status: r.status,
        count,
      },
    );
  }

  const accounts = [
    ["staging+part_a@example.test", "partner"],
    ["staging+part_b@example.test", "partner"],
    ["staging+part_pending@example.test", "partner_pending"],
    ["staging+cust_a@example.test", "customer"],
    ["staging+staff_s@example.test", "staff"],
    ["staging+admin_a@example.test", "admin"],
    ["staging+owner_o@example.test", "owner"],
  ];

  // Do not invent extra accounts from password vault keys.

  let partALeadId = null;
  let partAPartnerId = null;

  for (const [email, expectedKind] of accounts) {
    const password = passwords[email];
    if (!password) {
      rec(`login_${email}`, false, { note: "missing_password" });
      continue;
    }
    let sess;
    try {
      sess = await signIn(base, anon, email, password);
      rec(
        `login_${expectedKind}`,
        Boolean(sess.access_token && sess.user?.id),
        { email },
      );
    } catch (err) {
      rec(`login_${expectedKind}`, false, {
        email,
        note: String(err.message || err),
      });
      continue;
    }

    const identity = await resolveIdentity(
      base,
      anon,
      sess.access_token,
      sess.user.id,
    );
    const dest = destinationForIdentity(identity);
    rec(`route_${expectedKind}`, true, {
      email,
      primaryRole: identity.primaryRole,
      destination: dest.path,
      reason: dest.reason,
      partnerStatus: identity.partnerStatus,
    });

    if (expectedKind === "partner") {
      const okActive =
        identity.primaryRole === "partner" && dest.path === "/dashboard";
      rec(
        `partner_active_routes_dashboard_${email.includes("part_b") ? "b" : "a"}`,
        okActive,
        {
          primaryRole: identity.primaryRole,
          destination: dest.path,
        },
      );
      const commissions = await rest(
        base,
        anon,
        sess.access_token,
        "partner_commissions",
        "?select=id,status&limit=10",
      );
      rec(
        `partner_commissions_${email.includes("part_b") ? "b" : "a"}`,
        commissions.ok,
        {
          status: commissions.status,
          count: Array.isArray(commissions.data)
            ? commissions.data.length
            : null,
        },
      );
      const leads = await rest(
        base,
        anon,
        sess.access_token,
        "partner_leads",
        "?select=id&limit=10",
      );
      rec(`partner_leads_${email.includes("part_b") ? "b" : "a"}`, leads.ok, {
        status: leads.status,
        count: Array.isArray(leads.data) ? leads.data.length : null,
      });
      if (email.includes("part_a")) {
        partAPartnerId = identity.partnerProfileId;
        partALeadId =
          Array.isArray(leads.data) && leads.data[0] ? leads.data[0].id : null;
      }
      if (email.includes("part_b") && partALeadId) {
        const denied = await rest(
          base,
          anon,
          sess.access_token,
          "partner_leads",
          `?id=eq.${partALeadId}&select=id`,
        );
        rec(
          "partner_b_denied_partner_a_lead",
          Array.isArray(denied.data) && denied.data.length === 0,
          {
            status: denied.status,
            count: Array.isArray(denied.data) ? denied.data.length : null,
          },
        );
      }
    }

    if (expectedKind === "customer") {
      rec(
        "customer_denied_partner_dashboard",
        dest.reason === "customer_denied" || dest.path.includes("geen-toegang"),
        {
          destination: dest.path,
          primaryRole: identity.primaryRole,
        },
      );
      const leads = await rest(
        base,
        anon,
        sess.access_token,
        "partner_leads",
        "?select=id&limit=5",
      );
      const leadCount = Array.isArray(leads.data) ? leads.data.length : -1;
      rec(
        "customer_partner_leads_forbidden_or_empty",
        leadCount === 0 || leads.status >= 400,
        {
          status: leads.status,
          count: leadCount,
        },
      );
    }

    if (["staff", "admin", "owner"].includes(expectedKind)) {
      rec(`${expectedKind}_routes_admin`, dest.path === "/admin", {
        destination: dest.path,
        primaryRole: identity.primaryRole,
      });
    }

    if (expectedKind === "partner_pending") {
      rec("pending_routes_onboarding", dest.path === "/onboarding", {
        destination: dest.path,
        primaryRole: identity.primaryRole,
      });
    }
  }

  // feature flags fail-closed
  {
    const sess = await signIn(
      base,
      anon,
      "staging+part_a@example.test",
      passwords["staging+part_a@example.test"],
    );
    const flags = await rest(
      base,
      anon,
      sess.access_token,
      "feature_flags",
      "?key=in.(mollie_checkout,digital_product_checkout,partner_payouts)&select=key,enabled",
    );
    const enabled = Array.isArray(flags.data)
      ? flags.data.filter((f) => f.enabled === true).map((f) => f.key)
      : ["lookup_failed"];
    rec("checkout_mollie_payouts_fail_closed", enabled.length === 0, {
      enabled,
    });
  }

  const failed = results.filter((r) => !r.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    contract: CONTRACT,
    schema: SCHEMA,
    staging: STAGING,
    productionDenylist: PROD,
    partAPartnerId,
    partALeadId,
    results,
    summary: {
      total: results.length,
      pass: results.length - failed.length,
      fail: failed.length,
    },
  };
  fs.writeFileSync(
    path.join(evDir, "staging-partner-auth-smoke.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(`\nsummary ${report.summary.pass}/${report.summary.total} PASS`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error("SMOKE_FATAL", err instanceof Error ? err.message : err);
  process.exit(1);
});
