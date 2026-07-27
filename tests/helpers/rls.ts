import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAuthUser, createTestAdminClient, type LocalLegacyRole } from "@/tests/helpers/db";
import {
  advanceOrderToAwaitingPayment,
  approveSeller,
  confirmOrderDelivered,
  createAndConfirmManualBankPayment,
  createBankPayoutForCommissions,
  createCashPayoutAndConfirm,
  createCommissionsForOrder,
  createSellerOrder,
  onboardSeller,
  releaseCommissionsNow,
  setCommissionHoldDays,
} from "@/lib/workflows/finance";

export const RLS_PASSWORD = "Rls-Matrix-Password-1!";

export type AuthedActor = {
  label: string;
  userId: string;
  email: string;
  password: string;
  role: LocalLegacyRole;
  sellerProfileId?: string;
  client: SupabaseClient;
  accessToken: string;
};

export function canRunLiveJwtRls() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("54421")
      && process.env.SUPABASE_SERVICE_ROLE_KEY
      && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Anon credentials required for JWT/RLS tests");
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function signInAs(email: string, password: string): Promise<{ client: SupabaseClient; accessToken: string }> {
  const client = createAnonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw error ?? new Error(`No access token for ${email}`);
  }
  return { client, accessToken: data.session.access_token };
}

export async function createJwtActor(input: {
  label: string;
  role: LocalLegacyRole;
  email?: string;
  password?: string;
}): Promise<AuthedActor> {
  const password = input.password ?? RLS_PASSWORD;
  const email = input.email ?? `rls-${input.label}-${randomUUID()}@example.test`;
  const user = await createAuthUser({ role: input.role, email, password });
  const { client, accessToken } = await signInAs(email, password);
  return {
    label: input.label,
    userId: user.id,
    email,
    password,
    role: input.role,
    client,
    accessToken,
  };
}

export async function expectVisible(
  client: SupabaseClient,
  table: string,
  id: string,
  idColumn = "id",
) {
  const { data, error } = await client.from(table).select("*").eq(idColumn, id);
  if (error) throw new Error(`Expected visible ${table}.${id}: ${error.message}`);
  if (!data?.length) throw new Error(`Expected visible ${table}.${id} but got 0 rows (not empty-by-chance)`);
  return data;
}

export async function expectInvisible(
  client: SupabaseClient,
  table: string,
  id: string,
  idColumn = "id",
) {
  const { data, error } = await client.from(table).select("*").eq(idColumn, id);
  if (error) {
    const denied = /permission|rls|policy|42501|PGRST/i.test(error.message);
    if (!denied) throw new Error(`Unexpected error reading ${table}.${id}: ${error.message}`);
    return;
  }
  if ((data?.length ?? 0) > 0) {
    throw new Error(`Expected invisible ${table}.${id} but saw ${data!.length} row(s)`);
  }
}

export async function expectMutationDenied(
  promise: PromiseLike<{ data?: unknown; error: { message: string } | null }>,
  label: string,
) {
  const { data, error } = await promise;
  if (error) {
    const denied = /permission|rls|policy|42501|row-level|violates|PGRST|Sellers may only|Only owner/i.test(error.message);
    if (!denied) throw new Error(`Expected RLS/permission denial for ${label}, got: ${error.message}`);
    return;
  }
  const rows = Array.isArray(data) ? data.length : data ? 1 : 0;
  if (rows > 0) throw new Error(`Expected mutation denied for ${label}, but ${rows} row(s) were returned`);
}

/** UPDATE/DELETE under RLS often return success with 0 rows — verify via returning + admin read. */
export async function expectUpdateIneffective(
  client: SupabaseClient,
  table: string,
  id: string,
  patch: Record<string, unknown>,
  label: string,
  admin = createTestAdminClient(),
) {
  const { data: before, error: beforeError } = await admin.from(table).select("*").eq("id", id).single();
  if (beforeError || !before) throw beforeError ?? new Error(`Missing ${table}.${id} before ${label}`);
  const { data, error } = await client.from(table).update(patch).eq("id", id).select("id");
  if (error) {
    const denied = /permission|rls|policy|42501|row-level|violates|PGRST|Sellers may only|Only owner/i.test(error.message);
    if (!denied) throw new Error(`Unexpected error for ${label}: ${error.message}`);
    return;
  }
  if ((data?.length ?? 0) > 0) throw new Error(`Expected ineffective update for ${label}, but rows were updated`);
  const { data: after, error: afterError } = await admin.from(table).select("*").eq("id", id).single();
  if (afterError || !after) throw afterError ?? new Error(`Missing ${table}.${id} after ${label}`);
  for (const [key, value] of Object.entries(patch)) {
    if (after[key] === value && before[key] !== value) {
      throw new Error(`Update for ${label} changed ${key} despite RLS`);
    }
  }
}

export async function expectDeleteIneffective(
  client: SupabaseClient,
  table: string,
  id: string,
  label: string,
  admin = createTestAdminClient(),
) {
  const { data, error } = await client.from(table).delete().eq("id", id).select("id");
  if (error) {
    const denied = /permission|rls|policy|42501|row-level|violates|PGRST/i.test(error.message);
    if (!denied) throw new Error(`Unexpected error for ${label}: ${error.message}`);
  } else if ((data?.length ?? 0) > 0) {
    throw new Error(`Expected delete denied for ${label}`);
  }
  const { data: stillThere, error: readError } = await admin.from(table).select("id").eq("id", id).maybeSingle();
  if (readError) throw readError;
  if (!stillThere) throw new Error(`Delete for ${label} removed the row`);
}

export type RlsFixture = {
  admin: ReturnType<typeof createTestAdminClient>;
  owner: AuthedActor;
  finance: AuthedActor;
  sales: AuthedActor;
  support: AuthedActor;
  sellerA: AuthedActor;
  sellerB: AuthedActor;
  pending: AuthedActor;
  suspended: AuthedActor;
  blocked: AuthedActor;
  seed: {
    productId: string;
    variantId: string;
    productCostId: string;
    customerBId: string;
    orderBId: string;
    commissionBId: string;
    payoutBId: string;
    cashReceiptBId: string;
    ticketBId: string;
    notificationBId: string;
    adminNoteId: string;
    auditLogId: string;
    ledgerEntryId: string;
    agreementVersionId: string;
    suspendedOrderId: string;
  };
};

async function refreshActor(actor: AuthedActor, sellerProfileId?: string): Promise<AuthedActor> {
  const { client, accessToken } = await signInAs(actor.email, actor.password);
  return { ...actor, sellerProfileId, client, accessToken };
}

export async function buildRlsFixture(): Promise<RlsFixture> {
  const admin = createTestAdminClient();
  await setCommissionHoldDays(0);

  const owner = await createJwtActor({ label: "owner", role: "owner" });
  const finance = await createJwtActor({ label: "finance", role: "finance_admin" });
  const sales = await createJwtActor({ label: "sales", role: "sales_admin" });
  const support = await createJwtActor({ label: "support", role: "support_admin" });

  const sellerABase = await createJwtActor({ label: "seller-a", role: "seller" });
  const sellerBBase = await createJwtActor({ label: "seller-b", role: "seller" });
  const pendingBase = await createJwtActor({ label: "seller-pending", role: "seller" });
  const suspendedBase = await createJwtActor({ label: "seller-suspended", role: "seller" });
  const blockedBase = await createJwtActor({ label: "seller-blocked", role: "seller" });

  const sellerAProfile = await approveSeller(
    owner.userId,
    (await onboardSeller(sellerABase.userId, { name: "RLS Seller A", payout: "cash" })).id,
    "RLS fixture approve A",
  );
  const sellerBProfile = await approveSeller(
    owner.userId,
    (
      await onboardSeller(sellerBBase.userId, {
        name: "RLS Seller B",
        payout: "bank_transfer",
        iban: "NL91ABNA0417164300",
        accountHolder: "RLS Seller B",
      })
    ).id,
    "RLS fixture approve B",
  );
  const pendingProfile = await onboardSeller(pendingBase.userId, {
    name: "RLS Pending",
    payout: "cash",
  });
  const suspendedProfile = await approveSeller(
    owner.userId,
    (await onboardSeller(suspendedBase.userId, { name: "RLS Suspended", payout: "cash" })).id,
    "RLS fixture approve suspended",
  );
  const blockedProfile = await approveSeller(
    owner.userId,
    (await onboardSeller(blockedBase.userId, { name: "RLS Blocked", payout: "cash" })).id,
    "RLS fixture approve blocked",
  );

  const variantId = "21000000-0000-0000-0000-000000000001";
  const productId = "20000000-0000-0000-0000-000000000001";
  const { data: cost, error: costError } = await admin
    .from("product_costs")
    .select("id")
    .eq("variant_id", variantId)
    .limit(1)
    .single();
  if (costError || !cost) throw costError ?? new Error("Seed product_costs missing");

  await admin.from("product_seller_access").upsert(
    [
      { product_id: productId, seller_id: sellerAProfile.id, is_enabled: true },
      { product_id: productId, seller_id: sellerBProfile.id, is_enabled: true },
      { product_id: productId, seller_id: pendingProfile.id, is_enabled: true },
      { product_id: productId, seller_id: suspendedProfile.id, is_enabled: true },
      { product_id: productId, seller_id: blockedProfile.id, is_enabled: true },
    ],
    { onConflict: "product_id,seller_id" },
  );

  // Seller B commercial trail (visible to B, invisible to A)
  const orderB = await createSellerOrder(sellerBBase.userId, {
    customerName: "RLS Customer B",
    customerEmail: `rls-customer-b-${randomUUID()}@example.test`,
    variantId,
    quantity: 1,
  });
  await advanceOrderToAwaitingPayment(finance.userId, orderB.id);
  await createAndConfirmManualBankPayment(finance.userId, orderB.id);
  await confirmOrderDelivered(finance.userId, orderB.id, `RLS-DEL-${orderB.id.slice(0, 8)}`);
  const [commissionB] = await createCommissionsForOrder(finance.userId, orderB.id);
  await releaseCommissionsNow(finance.userId);
  const payoutResult = await createBankPayoutForCommissions(
    finance.userId,
    sellerBProfile.id,
    [commissionB.id],
  );

  const { data: orderRow } = await admin.from("orders").select("customer_id").eq("id", orderB.id).single();
  if (!orderRow?.customer_id) throw new Error("Order B missing customer");

  const cashOrder = await createSellerOrder(sellerBBase.userId, {
    customerName: "RLS Cash Seed",
    customerEmail: `rls-cash-${randomUUID()}@example.test`,
    variantId,
    quantity: 1,
  });
  await advanceOrderToAwaitingPayment(finance.userId, cashOrder.id);
  await createAndConfirmManualBankPayment(finance.userId, cashOrder.id);
  await confirmOrderDelivered(finance.userId, cashOrder.id, `RLS-CASH-DEL-${cashOrder.id.slice(0, 8)}`);
  const [cashCommission] = await createCommissionsForOrder(finance.userId, cashOrder.id);
  await releaseCommissionsNow(finance.userId);
  const cashPayout = await createCashPayoutAndConfirm(
    finance.userId,
    sellerBProfile.id,
    [cashCommission.id],
    "RLS Seller B",
  );
  const { data: cashReceipt, error: receiptError } = await admin
    .from("cash_receipts")
    .select("id")
    .eq("payout_id", cashPayout.payout.id)
    .single();
  if (receiptError || !cashReceipt) throw receiptError ?? new Error("Cash receipt B missing");

  const { data: ledgerEntry, error: ledgerError } = await admin
    .from("ledger_entries")
    .select("id")
    .eq("payout_id", payoutResult.payout.id)
    .eq("entry_type", "debit")
    .limit(1)
    .single();
  if (ledgerError || !ledgerEntry) throw ledgerError ?? new Error("Ledger entry for payout B missing");

  // Historical order for suspended seller (created while approved)
  const suspendedOrder = await createSellerOrder(suspendedBase.userId, {
    customerName: "RLS Suspended Customer",
    customerEmail: `rls-suspended-${randomUUID()}@example.test`,
    variantId,
    quantity: 1,
  });

  await admin
    .from("seller_profiles")
    .update({ status: "suspended", suspended_at: new Date().toISOString() })
    .eq("id", suspendedProfile.id);
  await admin.from("seller_profiles").update({ status: "blocked" }).eq("id", blockedProfile.id);

  const { data: ticketB, error: ticketError } = await admin
    .from("support_tickets")
    .insert({
      opened_by: sellerBBase.userId,
      seller_id: sellerBProfile.id,
      subject: "RLS Seller B ticket",
      status: "open",
    })
    .select("id")
    .single();
  if (ticketError || !ticketB) throw ticketError ?? new Error("Failed to seed ticket B");

  const { data: notificationB, error: notificationError } = await admin
    .from("notifications")
    .insert({
      recipient_id: sellerBBase.userId,
      type: "system",
      title: "RLS B notification",
      body: "Seller B only",
    })
    .select("id")
    .single();
  if (notificationError || !notificationB) throw notificationError ?? new Error("Failed to seed notification B");

  const { data: adminNote, error: noteError } = await admin
    .from("admin_notes")
    .insert({
      entity_type: "seller_profiles",
      entity_id: sellerBProfile.id,
      body: "Confidential admin note for seller B",
      created_by: owner.userId,
    })
    .select("id")
    .single();
  if (noteError || !adminNote) throw noteError ?? new Error("Failed to seed admin note");

  const { data: auditLog, error: auditError } = await admin
    .from("audit_logs")
    .insert({
      actor_id: owner.userId,
      action: "rls.fixture",
      entity_type: "seller_profiles",
      entity_id: sellerBProfile.id,
      after_data: { marker: "seller-b-only" },
    })
    .select("id")
    .single();
  if (auditError || !auditLog) throw auditError ?? new Error("Failed to seed audit log");

  const [sellerA, sellerB, pending, suspended, blocked] = await Promise.all([
    refreshActor(sellerABase, sellerAProfile.id),
    refreshActor(sellerBBase, sellerBProfile.id),
    refreshActor(pendingBase, pendingProfile.id),
    refreshActor(suspendedBase, suspendedProfile.id),
    refreshActor(blockedBase, blockedProfile.id),
  ]);

  return {
    admin,
    owner,
    finance,
    sales,
    support,
    sellerA,
    sellerB,
    pending,
    suspended,
    blocked,
    seed: {
      productId,
      variantId,
      productCostId: cost.id,
      customerBId: orderRow.customer_id,
      orderBId: orderB.id,
      commissionBId: commissionB.id,
      payoutBId: payoutResult.payout.id,
      cashReceiptBId: cashReceipt.id,
      ticketBId: ticketB.id,
      notificationBId: notificationB.id,
      adminNoteId: adminNote.id,
      auditLogId: auditLog.id,
      ledgerEntryId: ledgerEntry.id,
      agreementVersionId: "10000000-0000-0000-0000-000000000001",
      suspendedOrderId: suspendedOrder.id,
    },
  };
}
