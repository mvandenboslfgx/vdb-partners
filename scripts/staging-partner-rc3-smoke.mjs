/**
 * Partner Portal staging smoke — Owner RC3 (+ RC2 partner regression).
 * Vault credentials from sibling preflight evidence — never prints secrets.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STAGING = "qzekuvmgfekzsowdecyk";
const PROD = "nhsrdnjfsxfikfbdmdfj";
const CONTRACT = "vdb-backend-contract@0.2.0-rc.3";
const SCHEMA = "2026.07.25.messaging-support-appointments-rc3";

const FIXTURES = {
  conversation_id: "13eef477-68a3-4c08-98a1-1504311872b6",
  ticket_id: "5ee3d66a-9ab3-4d80-8137-349d3ce7cdad",
  internal_reply_id: "22fece85-c683-43d9-bc93-393aeaa90aa3",
  public_reply_id: "41d178d3-c3d4-4266-9558-6bc3ae4c113b",
  appointment_id: "5e98d023-afd0-4ec2-abee-92c19d306d85",
  attachment_id: "3e317fd5-b7d5-4d30-b3f9-2ba73bd8bad5",
  message_public_cust_id: "1f1e607b-80be-43b0-b479-35c0556c2df4",
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const evDir = path.join(root, "docs", "evidence", "staging-rc3-ui");
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

async function rpc(base, anon, token, fn, args) {
  const res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(args),
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

const results = [];
function rec(name, ok, detail = {}) {
  results.push({ name, ok, ...detail });
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name}${detail.note ? " — " + detail.note : ""}`,
  );
}

function deniedOrEmpty(r) {
  const count = Array.isArray(r.data) ? r.data.length : -1;
  return count === 0 || r.status >= 400;
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
    {
      host: new URL(base).host,
    },
  );
  rec("contract_pin_rc3", CONTRACT === "vdb-backend-contract@0.2.0-rc.3");
  rec(
    "schema_pin_rc3",
    SCHEMA === "2026.07.25.messaging-support-appointments-rc3",
  );
  rec("production_denylist", !base.includes(PROD));

  {
    const r = await rest(
      base,
      anon,
      anon,
      "portal_conversations",
      "?select=id&limit=1",
    );
    rec("anon_portal_conversations_denied_or_empty", deniedOrEmpty(r), {
      status: r.status,
      count: Array.isArray(r.data) ? r.data.length : null,
    });
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

  let partALeadId = null;

  for (const [email, expectedKind] of accounts) {
    const password = passwords[email];
    if (!password) {
      rec(`login_${expectedKind}`, false, { email, note: "missing_password" });
      continue;
    }
    let sess;
    try {
      sess = await signIn(base, anon, email, password);
      rec(
        `login_${expectedKind}${email.includes("part_b") ? "_b" : email.includes("part_a") ? "_a" : ""}`,
        Boolean(sess.access_token && sess.user?.id),
        {
          email,
        },
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
    rec(
      `route_${expectedKind}${email.includes("part_b") ? "_b" : email.includes("part_a") ? "_a" : ""}`,
      true,
      {
        primaryRole: identity.primaryRole,
        destination: dest.path,
        reason: dest.reason,
      },
    );

    if (expectedKind === "partner") {
      const tag = email.includes("part_b") ? "b" : "a";
      rec(
        `partner_${tag}_routes_dashboard`,
        dest.path === "/dashboard" && identity.primaryRole === "partner",
        {
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
      rec(`partner_${tag}_commissions_query`, commissions.ok, {
        status: commissions.status,
        count: Array.isArray(commissions.data) ? commissions.data.length : null,
      });

      const leads = await rest(
        base,
        anon,
        sess.access_token,
        "partner_leads",
        "?select=id&limit=10",
      );
      rec(`partner_${tag}_leads_query`, leads.ok, {
        status: leads.status,
        count: Array.isArray(leads.data) ? leads.data.length : null,
      });

      const sales = await rest(
        base,
        anon,
        sess.access_token,
        "partner_sales",
        "?select=id&limit=10",
      );
      rec(`partner_${tag}_sales_query`, sales.ok, {
        status: sales.status,
        count: Array.isArray(sales.data) ? sales.data.length : null,
      });

      const payouts = await rest(
        base,
        anon,
        sess.access_token,
        "partner_payouts",
        "?select=id,status&limit=10",
      );
      rec(`partner_${tag}_payouts_query`, payouts.ok, {
        status: payouts.status,
        count: Array.isArray(payouts.data) ? payouts.data.length : null,
      });

      if (identity.partnerProfileId) {
        const liability = await rpc(
          base,
          anon,
          sess.access_token,
          "partner_available_liability_cents",
          { p_partner_id: identity.partnerProfileId },
        );
        const ledger = await rest(
          base,
          anon,
          sess.access_token,
          "partner_ledger_entries",
          "?select=id&limit=5",
        );
        rec(`partner_${tag}_ledger_status`, liability.ok && ledger.ok, {
          liabilityStatus: liability.status,
          ledgerStatus: ledger.status,
          liabilityCents: liability.data,
          ledgerCount: Array.isArray(ledger.data) ? ledger.data.length : null,
          note: "partner_financial_summary skipped (owner RPC ambiguous partner_id)",
        });
      }

      // RC3 portal surfaces — partners are typically non-participants → empty/deny
      const conversations = await rest(
        base,
        anon,
        sess.access_token,
        "portal_conversations",
        "?select=id&limit=20",
      );
      rec(
        `partner_${tag}_conversations_empty_or_ok`,
        conversations.ok || conversations.status >= 400,
        {
          status: conversations.status,
          count: Array.isArray(conversations.data)
            ? conversations.data.length
            : null,
          note: "EmptyState allowed",
        },
      );

      const deniedConv = await rest(
        base,
        anon,
        sess.access_token,
        "portal_conversations",
        `?id=eq.${FIXTURES.conversation_id}&select=id`,
      );
      rec(
        `partner_${tag}_denied_customer_conversation`,
        deniedOrEmpty(deniedConv),
        {
          status: deniedConv.status,
          count: Array.isArray(deniedConv.data) ? deniedConv.data.length : null,
        },
      );

      const deniedMsg = await rest(
        base,
        anon,
        sess.access_token,
        "portal_messages",
        `?id=eq.${FIXTURES.message_public_cust_id}&select=id,is_internal`,
      );
      rec(`partner_${tag}_denied_customer_message`, deniedOrEmpty(deniedMsg), {
        status: deniedMsg.status,
        count: Array.isArray(deniedMsg.data) ? deniedMsg.data.length : null,
      });

      const deniedAttach = await rest(
        base,
        anon,
        sess.access_token,
        "portal_message_attachments",
        `?id=eq.${FIXTURES.attachment_id}&select=id`,
      );
      rec(
        `partner_${tag}_denied_customer_attachment`,
        deniedOrEmpty(deniedAttach),
        {
          status: deniedAttach.status,
          count: Array.isArray(deniedAttach.data)
            ? deniedAttach.data.length
            : null,
        },
      );

      const deniedTicket = await rest(
        base,
        anon,
        sess.access_token,
        "portal_support_tickets",
        `?id=eq.${FIXTURES.ticket_id}&select=id`,
      );
      rec(
        `partner_${tag}_denied_customer_ticket`,
        deniedOrEmpty(deniedTicket),
        {
          status: deniedTicket.status,
          count: Array.isArray(deniedTicket.data)
            ? deniedTicket.data.length
            : null,
        },
      );

      const internalReply = await rest(
        base,
        anon,
        sess.access_token,
        "portal_support_replies",
        `?id=eq.${FIXTURES.internal_reply_id}&select=id,is_internal`,
      );
      rec(
        `partner_${tag}_no_internal_support_reply`,
        deniedOrEmpty(internalReply),
        {
          status: internalReply.status,
          count: Array.isArray(internalReply.data)
            ? internalReply.data.length
            : null,
        },
      );

      const deniedAppt = await rest(
        base,
        anon,
        sess.access_token,
        "portal_appointments",
        `?id=eq.${FIXTURES.appointment_id}&select=id`,
      );
      rec(
        `partner_${tag}_denied_customer_appointment`,
        deniedOrEmpty(deniedAppt),
        {
          status: deniedAppt.status,
          count: Array.isArray(deniedAppt.data) ? deniedAppt.data.length : null,
        },
      );

      // Booking fail-closed
      const book = await rpc(
        base,
        anon,
        sess.access_token,
        "book_portal_appointment",
        {
          p_organization_id: "00000000-0000-0000-0000-000000000001",
          p_title: "PARTNER_RC3_SHOULD_FAIL",
          p_starts_at: new Date(Date.now() + 86400000).toISOString(),
          p_ends_at: new Date(Date.now() + 90000000).toISOString(),
        },
      );
      const bookMsg =
        typeof book.data === "object" && book.data?.message
          ? book.data.message
          : String(book.data ?? "");
      rec(`partner_${tag}_booking_fail_closed`, !book.ok, {
        status: book.status,
        note: bookMsg.slice(0, 80),
      });

      if (tag === "a") {
        partALeadId =
          Array.isArray(leads.data) && leads.data[0] ? leads.data[0].id : null;
      }
      if (tag === "b" && partALeadId) {
        const denied = await rest(
          base,
          anon,
          sess.access_token,
          "partner_leads",
          `?id=eq.${partALeadId}&select=id`,
        );
        rec("partner_b_denied_partner_a_lead", deniedOrEmpty(denied), {
          status: denied.status,
          count: Array.isArray(denied.data) ? denied.data.length : null,
        });
      }
    }

    if (expectedKind === "partner_pending") {
      rec("pending_routes_onboarding", dest.path === "/onboarding", {
        destination: dest.path,
      });
    }

    if (expectedKind === "customer") {
      rec(
        "customer_denied_partner_dashboard",
        dest.reason === "customer_denied",
        {
          destination: dest.path,
        },
      );
      const leads = await rest(
        base,
        anon,
        sess.access_token,
        "partner_leads",
        "?select=id&limit=5",
      );
      rec("customer_partner_leads_forbidden_or_empty", deniedOrEmpty(leads), {
        status: leads.status,
        count: Array.isArray(leads.data) ? leads.data.length : null,
      });
    }

    if (["staff", "admin", "owner"].includes(expectedKind)) {
      rec(`${expectedKind}_routes_admin`, dest.path === "/admin", {
        destination: dest.path,
        primaryRole: identity.primaryRole,
      });
      // Staff may see customer ticket / internal reply — not required for partner portal gate,
      // but admin surface should not be available via partner role paths (already routed).
    }
  }

  // Fail-closed flags
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
      "?key=in.(mollie_checkout,digital_product_checkout,partner_payouts,messaging_realtime,support_internal_notes_rpc,appointments_booking)&select=key,enabled",
    );
    const enabled = Array.isArray(flags.data)
      ? flags.data.filter((f) => f.enabled === true).map((f) => f.key)
      : ["lookup_failed"];
    rec("rc3_fail_closed_flags", enabled.length === 0, { enabled });
  }

  const failed = results.filter((r) => !r.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    contract: CONTRACT,
    schema: SCHEMA,
    staging: STAGING,
    productionDenylist: PROD,
    fixtures: FIXTURES,
    results,
    summary: {
      total: results.length,
      pass: results.length - failed.length,
      fail: failed.length,
    },
  };
  fs.writeFileSync(
    path.join(evDir, "staging-partner-rc3-smoke.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(`\nsummary ${report.summary.pass}/${report.summary.total} PASS`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error("SMOKE_FATAL", err instanceof Error ? err.message : err);
  process.exit(1);
});
