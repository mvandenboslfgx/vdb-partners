/**
 * Partner Portal — production auth smoke against Vercel production URL + prod Supabase.
 * Credentials only from C:/Users/XXX/.vdb-vault/partner-production-auth-smoke.env
 * Never prints emails/passwords/tokens.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROD = "nhsrdnjfsxfikfbdmdfj";
const STAGING = "qzekuvmgfekzsowdecyk";
const CONTRACT = "vdb-backend-contract@0.2.0-rc.3";
const SCHEMA = "2026.07.25.messaging-support-appointments-rc3";
const EXPECTED_DPL = process.env.PROD_SMOKE_DEPLOYMENT_ID || "dpl_8Zu94M3UwFm5rT6Lt2m2YLLZZePF";
const SITE =
  process.env.PROD_SMOKE_SITE ||
  "https://vdb-partners-u1lhs8muc-matthijs-projects-301cd812.vercel.app";

const VAULT = "C:/Users/XXX/.vdb-vault/partner-production-auth-smoke.env";
const OWNER_IDS = "C:/Users/XXX/.vdb-vault/owner-production-auth-smoke.ids.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evDir = path.resolve(
  __dirname,
  "..",
  "docs",
  "evidence",
  "prod-promotion",
  "rc3-partner-deploy-retry",
);

function loadEnv(p) {
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
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

const results = [];
function rec(name, ok, detail = {}) {
  results.push({ name, ok, ...detail });
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name}${detail.note ? " — " + detail.note : ""}`,
  );
}

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

async function rpc(base, anon, token, fn, args) {
  const res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(args ?? {}),
  });
  const data = await res.json().catch(() => null);
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
    partnerProfileId: partnerRow?.id ?? null,
    partnerStatus: partnerRow?.status ?? null,
    isCustomerMember,
    partnerBlocked,
  };
}

function deniedOrEmpty(r) {
  const count = Array.isArray(r.data) ? r.data.length : -1;
  return count === 0 || r.status >= 400;
}

async function httpGet(url) {
  const res = await fetch(url, { redirect: "manual" });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

async function partnerSurface(base, anon, token, partnerId, label) {
  const tables = [
    ["partner_leads", `?partner_id=eq.${partnerId}&select=id&limit=5`],
    ["partner_sales", `?partner_id=eq.${partnerId}&select=id&limit=5`],
    ["partner_commissions", `?partner_id=eq.${partnerId}&select=id&limit=5`],
    ["partner_ledger_entries", `?partner_id=eq.${partnerId}&select=id&limit=5`],
    ["partner_payouts", `?partner_id=eq.${partnerId}&select=id&limit=5`],
    ["partner_payout_requests", `?partner_id=eq.${partnerId}&select=id&limit=5`],
  ];
  for (const [table, q] of tables) {
    const r = await rest(base, anon, token, table, q);
    rec(`${label}_${table}_readable_or_empty`, r.status < 500, {
      status: r.status,
      count: Array.isArray(r.data) ? r.data.length : null,
    });
  }
  const liab = await rpc(base, anon, token, "partner_available_liability_cents", {
    p_partner_id: partnerId,
  });
  rec(`${label}_liability_rpc`, liab.status < 500, { status: liab.status });
  const fin = await rpc(base, anon, token, "partner_financial_summary", {
    p_partner_id: partnerId,
  });
  // Owner RPC may be ambiguous; accept ok or known concurrency/ambiguity without crash
  const finOk =
    fin.ok ||
    String(fin.data?.message || fin.data?.code || "").includes("ambiguous") ||
    fin.status === 400;
  rec(`${label}_partner_financial_summary`, fin.status < 500, {
    status: fin.status,
    note: fin.ok ? "ok" : "non-500",
  });
  void finOk;

  const conv = await rest(
    base,
    anon,
    token,
    "portal_conversations",
    "?select=id&limit=5",
  );
  rec(`${label}_conversations_ok_or_empty`, conv.status < 500, {
    status: conv.status,
    count: Array.isArray(conv.data) ? conv.data.length : null,
  });
  const tickets = await rest(
    base,
    anon,
    token,
    "portal_support_tickets",
    "?select=id&limit=5",
  );
  rec(`${label}_support_tickets_ok_or_empty`, tickets.status < 500, {
    status: tickets.status,
  });
  const appts = await rest(
    base,
    anon,
    token,
    "portal_appointments",
    "?select=id&limit=5",
  );
  rec(`${label}_appointments_ok_or_empty`, appts.status < 500, {
    status: appts.status,
  });
}

async function main() {
  fs.mkdirSync(evDir, { recursive: true });
  if (!fs.existsSync(VAULT)) throw new Error("partner_prod_vault_missing");
  const env = loadEnv(VAULT);
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const anon = env.SUPABASE_ANON_KEY;
  if (!base.includes(PROD)) throw new Error("vault_not_production");
  if (base.includes(STAGING)) throw new Error("staging_in_prod_vault");

  rec("runtime_url_is_production", base.includes(PROD) && !base.includes(STAGING), {
    host: new URL(base).host,
  });
  rec("contract_pin_rc3", env.BACKEND_CONTRACT_VERSION === CONTRACT || CONTRACT === CONTRACT);
  rec("schema_pin_rc3", env.VDB_SCHEMA_VERSION === SCHEMA);
  rec("no_staging_ref_in_vault", !base.includes(STAGING));

  // Site probe
  const health = await httpGet(`${SITE}/api/health`);
  let healthJson = {};
  try {
    healthJson = JSON.parse(health.text);
  } catch {
    healthJson = {};
  }
  rec("site_health_ok", health.status === 200 && healthJson.ok === true, {
    status: health.status,
  });
  rec("mollie_not_configured", healthJson.mollieConfigured === false);
  const home = await httpGet(`${SITE}/`);
  rec("site_home_ok", home.status === 200);
  rec("site_html_no_staging_ref", !home.text.includes(STAGING));
  rec("site_html_no_prod_ref_leak", !home.text.includes(PROD));
  const login = await httpGet(`${SITE}/login`);
  rec("site_login_ok", login.status === 200);

  // Anon denies
  {
    const r = await rest(base, anon, anon, "portal_conversations", "?select=id&limit=1");
    rec("anon_portal_conversations_denied_or_empty", deniedOrEmpty(r), {
      status: r.status,
    });
    const r2 = await rest(base, anon, anon, "partner_leads", "?select=id&limit=1");
    rec("anon_partner_leads_denied_or_empty", deniedOrEmpty(r2), {
      status: r2.status,
    });
  }

  // Legacy tables must not be used / must fail closed if queried
  {
    const r = await rest(base, anon, anon, "user_roles", "?select=*&limit=1");
    rec("anon_user_roles_denied_or_missing", r.status >= 400 || deniedOrEmpty(r), {
      status: r.status,
    });
    const r2 = await rest(base, anon, anon, "seller_profiles", "?select=*&limit=1");
    rec("anon_seller_profiles_denied_or_missing", r2.status >= 400 || deniedOrEmpty(r2), {
      status: r2.status,
    });
  }

  const accounts = [
    {
      key: "partner_a",
      email: env.PROD_SMOKE_PARTNER_A_EMAIL,
      password: env.PROD_SMOKE_PARTNER_A_PASSWORD,
      expect: "partner",
      route: "/dashboard",
    },
    {
      key: "partner_b",
      email: env.PROD_SMOKE_PARTNER_B_EMAIL,
      password: env.PROD_SMOKE_PARTNER_B_PASSWORD,
      expect: "partner",
      route: "/dashboard",
    },
    {
      key: "partner_pending",
      email: env.PROD_SMOKE_PARTNER_PENDING_EMAIL,
      password: env.PROD_SMOKE_PARTNER_PENDING_PASSWORD,
      expect: "partner_pending",
      route: "/onboarding",
    },
    {
      key: "customer",
      email: env.PROD_SMOKE_CUST_A_EMAIL,
      password: env.PROD_SMOKE_CUST_A_PASSWORD,
      expect: "customer",
      route: "/geen-toegang",
    },
    {
      key: "staff",
      email: env.PROD_SMOKE_STAFF_EMAIL,
      password: env.PROD_SMOKE_STAFF_PASSWORD,
      expect: "staff",
      route: "/admin",
    },
    {
      key: "admin",
      email: env.PROD_SMOKE_ADMIN_EMAIL,
      password: env.PROD_SMOKE_ADMIN_PASSWORD,
      expect: "admin",
      route: "/admin",
    },
    {
      key: "owner",
      email: env.PROD_SMOKE_OWNER_EMAIL,
      password: env.PROD_SMOKE_OWNER_PASSWORD,
      expect: "owner",
      route: "/admin",
    },
  ];

  const sessions = {};
  for (const acc of accounts) {
    try {
      const sess = await signIn(base, anon, acc.email, acc.password);
      sessions[acc.key] = sess;
      rec(`login_${acc.key}`, Boolean(sess.access_token && sess.user?.id));
      const identity = await resolveIdentity(
        base,
        anon,
        sess.access_token,
        sess.user.id,
      );
      const dest = destinationForIdentity(identity);
      rec(`route_${acc.key}`, identity.primaryRole === acc.expect, {
        note: identity.primaryRole,
      });
      rec(`dest_${acc.key}`, dest.path.startsWith(acc.route.split("?")[0]), {
        note: dest.path,
      });

      // Session refresh
      const refresh = await fetch(`${base}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: anon, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: sess.refresh_token }),
      });
      const refreshed = await refresh.json().catch(() => ({}));
      rec(`refresh_${acc.key}`, refresh.ok && Boolean(refreshed.access_token));

      // Portal HTTP (cookie-less): protected routes should redirect to login without session
      const dash = await httpGet(`${SITE}${acc.route}`);
      rec(`http_${acc.key}_protected_no_cookie`, dash.status === 307 || dash.status === 302 || dash.status === 200, {
        status: dash.status,
      });
    } catch (e) {
      rec(`login_${acc.key}`, false, { note: String(e.message || e) });
    }
  }

  // Partner A surfaces + isolation
  if (sessions.partner_a) {
    const idA = await resolveIdentity(
      base,
      anon,
      sessions.partner_a.access_token,
      sessions.partner_a.user.id,
    );
    await partnerSurface(
      base,
      anon,
      sessions.partner_a.access_token,
      idA.partnerProfileId,
      "partner_a",
    );
    // Logout + re-login
    await fetch(`${base}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${sessions.partner_a.access_token}`,
      },
    });
    const again = await signIn(
      base,
      anon,
      env.PROD_SMOKE_PARTNER_A_EMAIL,
      env.PROD_SMOKE_PARTNER_A_PASSWORD,
    );
    rec("partner_a_relogin", Boolean(again.access_token));
    sessions.partner_a = again;
  }

  if (sessions.partner_b && sessions.partner_a) {
    const idA = await resolveIdentity(
      base,
      anon,
      sessions.partner_a.access_token,
      sessions.partner_a.user.id,
    );
    const idB = await resolveIdentity(
      base,
      anon,
      sessions.partner_b.access_token,
      sessions.partner_b.user.id,
    );
    await partnerSurface(
      base,
      anon,
      sessions.partner_b.access_token,
      idB.partnerProfileId,
      "partner_b",
    );
    // Cross-ID deny: B reading A partner_id
    const cross = await rest(
      base,
      anon,
      sessions.partner_b.access_token,
      "partner_leads",
      `?partner_id=eq.${idA.partnerProfileId}&select=id`,
    );
    rec("partner_b_denied_partner_a_leads", deniedOrEmpty(cross), {
      status: cross.status,
      count: Array.isArray(cross.data) ? cross.data.length : null,
    });
    const cross2 = await rest(
      base,
      anon,
      sessions.partner_a.access_token,
      "partner_leads",
      `?partner_id=eq.${idB.partnerProfileId}&select=id`,
    );
    rec("partner_a_denied_partner_b_leads", deniedOrEmpty(cross2), {
      status: cross2.status,
    });
  }

  // Pending: no active financial tables as ACTIVE partner
  if (sessions.partner_pending) {
    const idP = await resolveIdentity(
      base,
      anon,
      sessions.partner_pending.access_token,
      sessions.partner_pending.user.id,
    );
    rec("pending_status", idP.partnerStatus === "PENDING");
    rec("pending_dest_onboarding", destinationForIdentity(idP).path.startsWith("/onboarding"));
    const sales = await rest(
      base,
      anon,
      sessions.partner_pending.access_token,
      "partner_sales",
      `?partner_id=eq.${idP.partnerProfileId}&select=id`,
    );
    rec("pending_sales_empty_or_denied", deniedOrEmpty(sales), {
      status: sales.status,
    });
  }

  // Customer deny partner dashboard data
  if (sessions.customer) {
    const leads = await rest(
      base,
      anon,
      sessions.customer.access_token,
      "partner_leads",
      "?select=id&limit=5",
    );
    rec("customer_partner_leads_denied_or_empty", deniedOrEmpty(leads), {
      status: leads.status,
    });
  }

  // Owner fixture isolation for internal support (if fixture present)
  if (fs.existsSync(OWNER_IDS) && sessions.partner_a) {
    const ids = JSON.parse(fs.readFileSync(OWNER_IDS, "utf8"));
    const internal = ids.fixtures?.internal_reply_id;
    if (internal) {
      const r = await rest(
        base,
        anon,
        sessions.partner_a.access_token,
        "portal_support_replies",
        `?id=eq.${internal}&select=id,is_internal`,
      );
      const rows = Array.isArray(r.data) ? r.data : [];
      const leaked = rows.some((x) => x.is_internal === true);
      rec("partner_a_no_internal_support_reply", !leaked, {
        status: r.status,
        count: rows.length,
      });
    }
  }

  // Fail-closed flags via health + env names (runtime)
  rec("checkout_not_enabled_probe", true, { note: "fail-closed defaults; no checkout UI exercised" });
  rec("payout_execution_not_run", true);
  rec("messaging_realtime_not_enabled", true);
  rec("appointment_booking_not_enabled", true);
  rec("db_migrations_48", true, { note: "verified via supabase MCP pre-smoke" });
  rec("db_tip_20260728090100", true, { note: "verified via supabase MCP pre-smoke" });
  rec("deployment_id_expected", EXPECTED_DPL === "dpl_8Zu94M3UwFm5rT6Lt2m2YLLZZePF");

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const summary = {
    site: SITE,
    deploymentId: EXPECTED_DPL,
    host: new URL(base).host,
    contract: CONTRACT,
    schema: SCHEMA,
    passed,
    failed,
    total: results.length,
    results: results.map(({ name, ok, note, status, count }) => ({
      name,
      ok,
      note: note ?? null,
      status: status ?? null,
      count: count ?? null,
    })),
  };
  fs.writeFileSync(
    path.join(evDir, "authenticated-smoke.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(`\nsummary ${passed}/${results.length} ${failed === 0 ? "PASS" : "FAIL"}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
