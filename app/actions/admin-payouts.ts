"use server";

import { appendAuditLog } from "@/lib/audit/log";
import { requirePermission, AuthorizationError } from "@/lib/auth/require-auth";
import { generateCashReceiptPdf } from "@/lib/documents/pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertNoActiveCommissionOverlap,
  createPayoutBatch as buildBatch,
} from "@/lib/payouts/batch";
import {
  confirmCashReceived,
  prepareCashPayout,
  requestCashConfirmation,
} from "@/lib/payouts/cash";
import type { CommissionForPayout, PayoutMethod } from "@/lib/payouts/types";
import { isFeatureEnabled } from "@/lib/feature-flags";

async function requireFinanceActor() {
  return requirePermission("process_payout");
}

export async function createPayoutBatch(input: {
  name: string;
  sellerId: string;
  method: PayoutMethod;
  commissionIds: string[];
}) {
  const actor = await requireFinanceActor();
  if (input.method === "cash" && !(await isFeatureEnabled("cash_payouts_enabled"))) {
    throw new Error("Contante uitbetalingen zijn niet geactiveerd.");
  }
  if (input.method === "bank_transfer" && !(await isFeatureEnabled("bank_payouts_enabled"))) {
    throw new Error("Bankuitbetalingen zijn niet geactiveerd.");
  }

  const db = createAdminClient();
  const { data: commissions, error } = await db
    .from("commissions")
    .select("id, seller_id, status, amount_cents")
    .in("id", input.commissionIds);

  if (error) throw error;
  if (!commissions || commissions.length !== input.commissionIds.length) {
    throw new Error("Een of meer commissies zijn niet gevonden.");
  }

  const mapped: CommissionForPayout[] = commissions.map((c) => ({
    id: c.id,
    sellerId: c.seller_id,
    status: c.status as CommissionForPayout["status"],
    amount: c.amount_cents,
  }));

  const { data: activeItems } = await db
    .from("payout_items")
    .select("commission_id, payouts!inner(status)")
    .in("commission_id", input.commissionIds);

  const activeIds = (activeItems ?? [])
    .filter((row) => {
      const payoutRelation = row.payouts as { status?: string } | { status?: string }[] | null;
      const status = Array.isArray(payoutRelation) ? payoutRelation[0]?.status : payoutRelation?.status;
      return status && !["cancelled", "reversed"].includes(status);
    })
    .map((row) => row.commission_id);

  assertNoActiveCommissionOverlap(input.commissionIds, activeIds);

  const draft = buildBatch(input.sellerId, input.method, mapped);
  const total = draft.amount;

  const { data: batch, error: batchError } = await db
    .from("payout_batches")
    .insert({
      batch_number: `VDB-BATCH-TEMP-${Date.now()}`,
      status: "draft",
      currency: "EUR",
      prepared_by: actor.id,
      total_amount_cents: total,
      name: input.name,
    })
    .select()
    .single();

  if (batchError) {
    // Fallback without name column if schema variant
    const { data: batch2, error: batchError2 } = await db
      .from("payout_batches")
      .insert({
        status: "draft",
        currency: "EUR",
        prepared_by: actor.id,
        total_amount_cents: total,
      })
      .select()
      .single();
    if (batchError2) throw batchError2;

    const { data: payout, error: payoutError } = await db
      .from("payouts")
      .insert({
        payout_batch_id: batch2.id,
        seller_id: input.sellerId,
        method: input.method,
        status: "draft",
        currency: "EUR",
        total_amount_cents: total,
      })
      .select()
      .single();
    if (payoutError) throw payoutError;

    const items = mapped.map((c) => ({
      payout_id: payout.id,
      commission_id: c.id,
      amount_cents: c.amount,
    }));
    const { error: itemsError } = await db.from("payout_items").insert(items);
    if (itemsError) throw itemsError;

    await db
      .from("commissions")
      .update({ status: "scheduled_for_payout" })
      .in("id", input.commissionIds);

    await appendAuditLog({
      actor: actor.id,
      role: actor.role,
      action: "payout_batch.create",
      entityType: "payout_batch",
      entityId: batch2.id,
      after: { sellerId: input.sellerId, method: input.method, total },
    });

    return { batch: batch2, payout };
  }

  const { data: payout, error: payoutError } = await db
    .from("payouts")
    .insert({
      payout_batch_id: batch.id,
      seller_id: input.sellerId,
      method: input.method,
      status: "draft",
      currency: "EUR",
      total_amount_cents: total,
    })
    .select()
    .single();
  if (payoutError) throw payoutError;

  const items = mapped.map((c) => ({
    payout_id: payout.id,
    commission_id: c.id,
    amount_cents: c.amount,
  }));
  const { error: itemsError } = await db.from("payout_items").insert(items);
  if (itemsError) throw itemsError;

  await db
    .from("commissions")
    .update({ status: "scheduled_for_payout" })
    .in("id", input.commissionIds);

  await appendAuditLog({
    actor: actor.id,
    role: actor.role,
    action: "payout_batch.create",
    entityType: "payout_batch",
    entityId: batch.id,
    after: { sellerId: input.sellerId, method: input.method, total },
  });

  return { batch, payout };
}

export async function approvePayoutBatch(batchId: string, reason?: string) {
  const actor = await requireFinanceActor();
  const db = createAdminClient();
  const { data, error } = await db
    .from("payout_batches")
    .update({
      status: "approved",
      approved_by: actor.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", batchId)
    .eq("status", "draft")
    .select()
    .single();
  if (error) throw error;

  await appendAuditLog({
    actor: actor.id,
    role: actor.role,
    action: "payout_batch.approve",
    entityType: "payout_batch",
    entityId: batchId,
    reason,
    after: { status: "approved" },
  });
  return data;
}

export async function registerBankPayout(input: {
  payoutId: string;
  paymentReference: string;
  paidAt?: string;
}) {
  const actor = await requireFinanceActor();
  const db = createAdminClient();

  const { data: payout, error } = await db
    .from("payouts")
    .select("*, payout_items(*)")
    .eq("id", input.payoutId)
    .single();
  if (error) throw error;
  if (payout.method !== "bank_transfer") throw new Error("Alleen bankuitbetalingen.");

  const { data: updated, error: updateError } = await db
    .from("payouts")
    .update({
      status: "paid",
      payment_reference: input.paymentReference,
      paid_at: input.paidAt ?? new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", input.payoutId)
    .select()
    .single();
  if (updateError) throw updateError;

  const commissionIds = (payout.payout_items ?? []).map(
    (item: { commission_id: string }) => item.commission_id,
  );
  if (commissionIds.length) {
    await db.from("commissions").update({ status: "paid", paid_at: new Date().toISOString() }).in("id", commissionIds);
  }

  const transactionId = crypto.randomUUID();
  await db.from("ledger_entries").insert([
    {
      transaction_id: transactionId,
      account_id: await resolveLedgerAccount(db, "seller_payable"),
      payout_id: payout.id,
      entry_type: "debit",
      amount_cents: payout.total_amount_cents,
      currency: payout.currency,
      description: `Bankuitbetaling ${input.paymentReference}`,
      created_by: actor.id,
    },
    {
      transaction_id: transactionId,
      account_id: await resolveLedgerAccount(db, "bank"),
      payout_id: payout.id,
      entry_type: "credit",
      amount_cents: payout.total_amount_cents,
      currency: payout.currency,
      description: `Bankuitbetaling ${input.paymentReference}`,
      created_by: actor.id,
    },
  ]);

  await appendAuditLog({
    actor: actor.id,
    role: actor.role,
    action: "payout.bank.register",
    entityType: "payout",
    entityId: payout.id,
    after: { reference: input.paymentReference, amount: payout.total_amount_cents },
  });

  return updated;
}

export async function prepareCashPayoutAction(input: {
  payoutId: string;
  recipientName: string;
  location?: string;
}) {
  const actor = await requireFinanceActor();
  if (!(await isFeatureEnabled("cash_payouts_enabled"))) {
    throw new Error("Contante uitbetalingen zijn niet geactiveerd.");
  }
  const db = createAdminClient();
  const { data: payout, error } = await db.from("payouts").select("*").eq("id", input.payoutId).single();
  if (error) throw error;
  if (payout.method !== "cash") throw new Error("Alleen contante uitbetalingen.");

  const receiptNumber = `VDB-CASH-${Date.now()}`;
  const prepared = prepareCashPayout(
    {
      id: payout.payout_batch_id ?? payout.id,
      sellerId: payout.seller_id,
      method: "cash",
      commissionIds: [],
      amount: payout.total_amount_cents,
      status: "draft",
    },
    input.recipientName,
    receiptNumber,
  );
  const awaiting = requestCashConfirmation(prepared);

  const { data: updated, error: updateError } = await db
    .from("payouts")
    .update({ status: "awaiting_confirmation", payment_reference: receiptNumber })
    .eq("id", input.payoutId)
    .select()
    .single();
  if (updateError) throw updateError;

  try {
    await db.from("cash_receipts").insert({
      payout_id: payout.id,
      receipt_number: receiptNumber,
      recipient_name: input.recipientName,
      location: input.location ?? null,
      status: "awaiting_confirmation",
      prepared_by: actor.id,
    });
  } catch {
    // Table/column variants must not block payout preparation during local schema drift.
  }

  await appendAuditLog({
    actor: actor.id,
    role: actor.role,
    action: "payout.cash.prepare",
    entityType: "payout",
    entityId: payout.id,
    after: awaiting,
  });

  return { payout: updated, receiptNumber };
}

export async function confirmCashPayoutReceipt(input: {
  payoutId: string;
  recipientName: string;
  asOwnerOverride?: boolean;
  reason?: string;
}) {
  const db = createAdminClient();
  const { data: payout, error } = await db.from("payouts").select("*, seller_profiles(user_id)").eq("id", input.payoutId).single();
  if (error) throw error;

  let actor;
  try {
    actor = await requirePermission("process_payout");
    if (!input.asOwnerOverride) {
      // Owner/finance may confirm with documented override
    }
  } catch {
    const seller = await requirePermission("manage_own_profile");
    const sellerUserId = Array.isArray(payout.seller_profiles)
      ? payout.seller_profiles[0]?.user_id
      : payout.seller_profiles?.user_id;
    if (sellerUserId !== seller.id) throw new AuthorizationError("Alleen de verkoper mag ontvangst bevestigen.");
    actor = seller;
  }

  if (input.asOwnerOverride && actor.role !== "owner" && actor.role !== "finance_admin") {
    throw new AuthorizationError("Alleen owner/finance mag handmatig bevestigen.");
  }

  confirmCashReceived(
    {
      batchId: payout.payout_batch_id ?? payout.id,
      recipientName: input.recipientName,
      receiptNumber: payout.payment_reference ?? "",
      status: "awaiting_confirmation",
    },
    input.recipientName,
  );

  const { data: updated, error: updateError } = await db
    .from("payouts")
    .update({
      status: "confirmed_received",
      confirmed_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
    })
    .eq("id", input.payoutId)
    .select()
    .single();
  if (updateError) throw updateError;

  const { data: items } = await db.from("payout_items").select("commission_id").eq("payout_id", input.payoutId);
  const commissionIds = (items ?? []).map((i) => i.commission_id);
  if (commissionIds.length) {
    await db.from("commissions").update({ status: "paid", paid_at: new Date().toISOString() }).in("id", commissionIds);
  }

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateCashReceiptPdf(payout.payment_reference ?? input.payoutId, [
      "VDB Digital Software — Contante ontvangstbon",
      `Verkoper: ${input.recipientName}`,
      `Bedrag: ${(payout.total_amount_cents / 100).toFixed(2)} ${payout.currency}`,
      `Datum: ${new Date().toISOString()}`,
      "Klanten betalen altijd rechtstreeks aan VDB Digital Software.",
      "Deze uitbetaling is VDB Digital Software → Verkoper.",
    ]);
  } catch {
    pdfBuffer = null;
  }

  await appendAuditLog({
    actor: actor.id,
    role: actor.role,
    action: "payout.cash.confirm",
    entityType: "payout",
    entityId: payout.id,
    reason: input.reason,
    after: { status: "confirmed_received", pdfGenerated: Boolean(pdfBuffer) },
  });

  return { payout: updated, pdfGenerated: Boolean(pdfBuffer) };
}

async function resolveLedgerAccount(
  db: ReturnType<typeof createAdminClient>,
  code: string,
): Promise<string> {
  const { data } = await db.from("ledger_accounts").select("id").eq("code", code).maybeSingle();
  if (data?.id) return data.id;
  const { data: created, error } = await db
    .from("ledger_accounts")
    .insert({
      code,
      name: code,
      account_type: code === "bank" ? "asset" : "liability",
      currency: "EUR",
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}
