import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertLocalLegacySellerDomainAllowed } from "@/lib/contract/local-legacy";
import {
  assertTransition,
  type OrderStatus,
} from "@/lib/orders/status-machine";
import { generateSellerCode } from "@/lib/referrals/codes";
import { encrypt } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/service";

type Db = SupabaseClient;
const agreementId = "10000000-0000-0000-0000-000000000001";

function database(client?: Db) {
  assertLocalLegacySellerDomainAllowed();
  return client ?? createAdminClient();
}

async function requireData<T>(
  request: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<NonNullable<T>> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  if (data === null)
    throw new Error("Expected database record was not returned");
  return data as NonNullable<T>;
}

async function audit(
  db: Db,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  afterData?: object,
) {
  const { error } = await db.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    after_data: afterData ?? null,
  });
  if (error) throw new Error(error.message);
}

async function transitionOrder(
  db: Db,
  actorId: string,
  orderId: string,
  target: OrderStatus,
) {
  const order = await requireData(
    db.from("orders").select("id, status").eq("id", orderId).single(),
  );
  const from = order.status as OrderStatus;
  assertTransition(from, target);
  const updated = await requireData(
    db
      .from("orders")
      .update({ status: target })
      .eq("id", orderId)
      .select()
      .single(),
  );
  await audit(db, actorId, "order.status_changed", "orders", orderId, {
    from,
    to: target,
  });
  return updated;
}

export interface OnboardingSteps {
  name: string;
  publicName?: string;
  payout: "cash" | "bank_transfer";
  iban?: string;
  accountHolder?: string;
}

export async function onboardSeller(
  actorUserId: string,
  steps: OnboardingSteps,
  client?: Db,
) {
  const db = database(client);
  const publicName = steps.publicName ?? steps.name;
  const seller = await requireData(
    db
      .from("seller_profiles")
      .upsert(
        {
          user_id: actorUserId,
          account_type: "particular",
          public_name: publicName,
          referral_code: generateSellerCode(),
          // The schema CHECK requires a valid payout destination immediately.
          payout_method: "cash",
        },
        { onConflict: "user_id" },
      )
      .select()
      .single(),
  );
  await requireData(
    db
      .from("profiles")
      .update({ display_name: steps.name })
      .eq("id", actorUserId)
      .select()
      .single(),
  );

  if (steps.payout === "bank_transfer") {
    if (!steps.iban || !steps.accountHolder)
      throw new Error("Bank payout requires an IBAN and account holder");
    await requireData(
      db
        .from("seller_profiles")
        .update({
          payout_method: "bank_transfer",
          payout_iban: encrypt(steps.iban.replace(/\s/g, "").toUpperCase()),
          payout_account_holder: steps.accountHolder,
        })
        .eq("id", seller.id)
        .select()
        .single(),
    );
  }

  await requireData(
    db
      .from("seller_verifications")
      .upsert(
        {
          seller_id: seller.id,
          verification_type: "identity",
          status: "manual_review",
          provider: "manual",
        },
        { onConflict: "seller_id,verification_type" },
      )
      .select()
      .single(),
  );
  await requireData(
    db
      .from("partner_agreement_acceptances")
      .upsert(
        {
          seller_id: seller.id,
          agreement_version_id: agreementId,
          accepted_by: actorUserId,
        },
        { onConflict: "seller_id,agreement_version_id" },
      )
      .select()
      .single(),
  );
  const submitted = await requireData(
    db
      .from("seller_profiles")
      .update({ status: "pending_review" })
      .eq("id", seller.id)
      .select()
      .single(),
  );
  await audit(
    db,
    actorUserId,
    "seller.onboarding_submitted",
    "seller_profiles",
    seller.id,
    { status: submitted.status },
  );
  return submitted;
}

export async function approveSeller(
  actorId: string,
  sellerProfileId: string,
  reason: string,
  client?: Db,
) {
  const db = database(client);
  const seller = await requireData(
    db
      .from("seller_profiles")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", sellerProfileId)
      .eq("status", "pending_review")
      .select()
      .single(),
  );
  await audit(
    db,
    actorId,
    "seller.approved",
    "seller_profiles",
    sellerProfileId,
    { reason, status: seller.status },
  );
  return seller;
}

export async function createSellerOrder(
  actorUserId: string,
  input: {
    customerName: string;
    customerEmail: string;
    variantId: string;
    quantity: number;
  },
  client?: Db,
) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1)
    throw new Error("Quantity must be a positive integer");
  const db = database(client);
  const seller = await requireData(
    db
      .from("seller_profiles")
      .select("id, status")
      .eq("user_id", actorUserId)
      .single(),
  );
  if (seller.status !== "approved")
    throw new Error("Only approved sellers may create orders");
  const variant = await requireData(
    db
      .from("product_variants")
      .select("id, product_id, name, sku, products(name, is_active)")
      .eq("id", input.variantId)
      .single(),
  );
  const product = Array.isArray(variant.products)
    ? variant.products[0]
    : variant.products;
  if (!product?.is_active) throw new Error("Product variant is unavailable");
  const price = await requireData(
    db
      .from("product_prices")
      .select("amount_cents, tax_rate_bps, currency")
      .eq("variant_id", input.variantId)
      .lte("valid_from", new Date().toISOString())
      .or(`valid_to.is.null,valid_to.gt.${new Date().toISOString()}`)
      .order("valid_from", { ascending: false })
      .limit(1)
      .single(),
  );
  const customer = await requireData(
    db
      .from("customers")
      .upsert(
        { email: input.customerEmail, full_name: input.customerName },
        { onConflict: "email" },
      )
      .select()
      .single(),
  );
  const subtotal = price.amount_cents * input.quantity;
  const tax = Math.round((subtotal * price.tax_rate_bps) / 10_000);
  const order = await requireData(
    db
      .from("orders")
      .insert({
        customer_id: customer.id,
        seller_id: seller.id,
        status: "submitted",
        currency: price.currency,
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: subtotal + tax,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single(),
  );
  await requireData(
    db
      .from("order_items")
      .insert({
        order_id: order.id,
        variant_id: variant.id,
        product_name_snapshot: product.name,
        variant_name_snapshot: variant.name,
        quantity: input.quantity,
        unit_price_cents: price.amount_cents,
        tax_rate_bps: price.tax_rate_bps,
        line_subtotal_cents: subtotal,
        line_tax_cents: tax,
        line_total_cents: subtotal + tax,
      })
      .select()
      .single(),
  );
  await audit(db, actorUserId, "order.created", "orders", order.id, {
    totalCents: order.total_cents,
  });
  return order;
}

export async function advanceOrderToAwaitingPayment(
  actorId: string,
  orderId: string,
  client?: Db,
) {
  const db = database(client);
  for (const target of [
    "under_review",
    "payment_link_pending",
    "awaiting_payment",
  ] as const) {
    await transitionOrder(db, actorId, orderId, target);
  }
  return requireData(db.from("orders").select().eq("id", orderId).single());
}

export async function createAndConfirmManualBankPayment(
  actorId: string,
  orderId: string,
  client?: Db,
) {
  const db = database(client);
  const order = await requireData(
    db
      .from("orders")
      .select("id, total_cents, currency, status")
      .eq("id", orderId)
      .single(),
  );
  if (order.status !== "awaiting_payment")
    throw new Error("Order must await payment");
  const payment = await requireData(
    db
      .from("payments")
      .insert({
        order_id: orderId,
        provider: "manual_bank_transfer",
        provider_payment_id: `bank-${randomUUID()}`,
        status: "pending",
        currency: order.currency,
        amount_cents: order.total_cents,
      })
      .select()
      .single(),
  );
  await requireData(
    db
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .select()
      .single(),
  );
  await transitionOrder(db, actorId, orderId, "payment_received");
  await transitionOrder(db, actorId, orderId, "payment_verified");
  await audit(
    db,
    actorId,
    "payment.manual_bank_verified",
    "payments",
    payment.id,
    { orderId },
  );
  return requireData(
    db.from("payments").select().eq("id", payment.id).single(),
  );
}

export async function confirmOrderDelivered(
  actorId: string,
  orderId: string,
  reference: string,
  client?: Db,
) {
  const db = database(client);
  const order = await requireData(
    db.from("orders").select("status").eq("id", orderId).single(),
  );
  if (order.status === "payment_verified")
    await transitionOrder(db, actorId, orderId, "fulfilment_pending");
  const current = await requireData(
    db.from("orders").select("status").eq("id", orderId).single(),
  );
  if (current.status === "fulfilment_pending")
    await transitionOrder(db, actorId, orderId, "in_fulfilment");
  await transitionOrder(db, actorId, orderId, "delivered");
  const deliveredAt = new Date().toISOString();
  const delivered = await requireData(
    db
      .from("orders")
      .update({ delivered_at: deliveredAt })
      .eq("id", orderId)
      .select()
      .single(),
  );
  await requireData(
    db
      .from("fulfilments")
      .upsert(
        {
          order_id: orderId,
          status: "delivered",
          delivery_reference: reference,
          delivered_at: deliveredAt,
        },
        { onConflict: "order_id" },
      )
      .select()
      .single(),
  );
  await audit(db, actorId, "order.delivered", "orders", orderId, { reference });
  return delivered;
}

export async function createCommissionsForOrder(
  actorId: string,
  orderId: string,
  client?: Db,
) {
  const db = database(client);
  const order = await requireData(
    db
      .from("orders")
      .select("seller_id, status, currency")
      .eq("id", orderId)
      .single(),
  );
  if (
    !order.seller_id ||
    ![
      "payment_verified",
      "fulfilment_pending",
      "in_fulfilment",
      "delivered",
      "completed",
    ].includes(order.status)
  ) {
    throw new Error("Commission requires a seller order with verified payment");
  }
  const items = await requireData(
    db
      .from("order_items")
      .select("id, variant_id, line_subtotal_cents, quantity")
      .eq("order_id", orderId),
  );
  const created = [];
  for (const item of items) {
    const variant = await requireData(
      db
        .from("product_variants")
        .select("product_id")
        .eq("id", item.variant_id)
        .single(),
    );
    const rule = await requireData(
      db
        .from("commission_rule_versions")
        .select(
          "id, calculation_type, fixed_amount_cents, percentage_bps, currency",
        )
        .eq("product_id", variant.product_id)
        .lte("effective_from", new Date().toISOString())
        .or(`effective_to.is.null,effective_to.gt.${new Date().toISOString()}`)
        .order("effective_from", { ascending: false })
        .limit(1)
        .single(),
    );
    const amount =
      rule.calculation_type === "fixed_amount"
        ? (rule.fixed_amount_cents ?? 0) * item.quantity
        : Math.round(
            (item.line_subtotal_cents * (rule.percentage_bps ?? 0)) / 10_000,
          );
    const calculation = await requireData(
      db
        .from("commission_calculations")
        .insert({
          order_item_id: item.id,
          seller_id: order.seller_id,
          commission_rule_version_id: rule.id,
          basis_amount_cents: item.line_subtotal_cents,
          calculated_amount_cents: amount,
          currency: rule.currency,
        })
        .select()
        .single(),
    );
    created.push(
      await requireData(
        db
          .from("commissions")
          .insert({
            calculation_id: calculation.id,
            seller_id: order.seller_id,
            order_id: orderId,
            status: "pending",
            amount_cents: amount,
            currency: order.currency,
          })
          .select()
          .single(),
      ),
    );
  }
  await audit(db, actorId, "commission.created", "orders", orderId, {
    commissionIds: created.map((commission) => commission.id),
  });
  return created;
}

export async function setCommissionHoldDays(days: number, client?: Db) {
  if (!Number.isInteger(days) || days < 0)
    throw new Error("Hold days must be a non-negative integer");
  const db = database(client);
  return requireData(
    db
      .from("system_settings")
      .upsert(
        {
          key: "commission_hold_days",
          value: days,
          description: "Days after delivery before a commission is available",
        },
        { onConflict: "key" },
      )
      .select()
      .single(),
  );
}

export async function releaseCommissionsNow(actorId: string, client?: Db) {
  const db = database(client);
  const setting = await requireData(
    db
      .from("system_settings")
      .select("value")
      .eq("key", "commission_hold_days")
      .single(),
  );
  const holdDays = Number(setting.value);
  const pending = await requireData(
    db
      .from("commissions")
      .select("id, order_id, status")
      .in("status", ["pending", "on_hold"]),
  );
  const released = [];
  for (const commission of pending) {
    const order = await requireData(
      db
        .from("orders")
        .select("delivered_at")
        .eq("id", commission.order_id)
        .single(),
    );
    if (!order.delivered_at) continue;
    const availableAt = new Date(
      new Date(order.delivered_at).getTime() + holdDays * 86_400_000,
    );
    if (availableAt > new Date()) continue;
    released.push(
      await requireData(
        db
          .from("commissions")
          .update({
            status: "available",
            available_at: availableAt.toISOString(),
          })
          .eq("id", commission.id)
          .select()
          .single(),
      ),
    );
  }
  for (const commission of released)
    await audit(
      db,
      actorId,
      "commission.released",
      "commissions",
      commission.id,
      { status: "available" },
    );
  return released;
}

async function ledgerAccounts(db: Db) {
  const accounts = await requireData(
    db.from("ledger_accounts").select("id, code").in("code", ["1010", "2100"]),
  );
  const byCode = new Map(accounts.map((account) => [account.code, account.id]));
  if (!byCode.get("1010") || !byCode.get("2100"))
    throw new Error("Ledger accounts 1010 and 2100 are required");
  return { bank: byCode.get("1010")!, payable: byCode.get("2100")! };
}

async function preparePayout(
  actorId: string,
  sellerId: string,
  commissionIds: string[],
  method: "bank_transfer" | "cash",
  db: Db,
) {
  if (!commissionIds.length)
    throw new Error("At least one commission is required");
  const commissions = await requireData(
    db
      .from("commissions")
      .select("id, seller_id, status, amount_cents, currency")
      .in("id", commissionIds),
  );
  if (
    commissions.length !== commissionIds.length ||
    commissions.some(
      (commission) =>
        commission.seller_id !== sellerId || commission.status !== "available",
    )
  ) {
    throw new Error("Payout requires the seller's available commissions");
  }
  const total = commissions.reduce(
    (sum, commission) => sum + commission.amount_cents,
    0,
  );
  const batch = await requireData(
    db
      .from("payout_batches")
      .insert({
        status: "approved",
        currency: commissions[0].currency,
        prepared_by: actorId,
        approved_by: actorId,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single(),
  );
  const payout = await requireData(
    db
      .from("payouts")
      .insert({
        payout_batch_id: batch.id,
        seller_id: sellerId,
        method,
        status: "draft",
        currency: commissions[0].currency,
        total_amount_cents: total,
      })
      .select()
      .single(),
  );
  await requireData(
    db
      .from("payout_items")
      .insert(
        commissions.map((commission) => ({
          payout_id: payout.id,
          commission_id: commission.id,
          amount_cents: commission.amount_cents,
        })),
      )
      .select(),
  );
  await requireData(
    db
      .from("commissions")
      .update({ status: "scheduled_for_payout" })
      .in("id", commissionIds)
      .select(),
  );
  return { batch, payout, commissions, total };
}

export async function createBankPayoutForCommissions(
  actorId: string,
  sellerId: string,
  commissionIds: string[],
  client?: Db,
) {
  const db = database(client);
  const { batch, payout, total } = await preparePayout(
    actorId,
    sellerId,
    commissionIds,
    "bank_transfer",
    db,
  );
  const paidAt = new Date().toISOString();
  const paid = await requireData(
    db
      .from("payouts")
      .update({
        status: "paid",
        payment_reference: `BANK-${randomUUID()}`,
        paid_at: paidAt,
        confirmed_at: paidAt,
      })
      .eq("id", payout.id)
      .select()
      .single(),
  );
  await requireData(
    db
      .from("payout_batches")
      .update({ status: "completed", completed_at: paidAt })
      .eq("id", batch.id)
      .select()
      .single(),
  );
  await requireData(
    db
      .from("commissions")
      .update({ status: "paid", paid_at: paidAt })
      .in("id", commissionIds)
      .select(),
  );
  const accounts = await ledgerAccounts(db);
  const transactionId = randomUUID();
  await requireData(
    db
      .from("ledger_entries")
      .insert([
        {
          transaction_id: transactionId,
          account_id: accounts.payable,
          payout_id: payout.id,
          entry_type: "debit",
          amount_cents: total,
          currency: paid.currency,
          description: "Seller bank payout",
          created_by: actorId,
        },
        {
          transaction_id: transactionId,
          account_id: accounts.bank,
          payout_id: payout.id,
          entry_type: "credit",
          amount_cents: total,
          currency: paid.currency,
          description: "Seller bank payout",
          created_by: actorId,
        },
      ])
      .select(),
  );
  await audit(db, actorId, "payout.bank_paid", "payouts", payout.id, {
    total,
    transactionId,
  });
  return { batch, payout: paid, transactionId };
}

export async function createCashPayoutAndConfirm(
  actorId: string,
  sellerId: string,
  commissionIds: string[],
  recipientName: string,
  client?: Db,
) {
  const db = database(client);
  const { batch, payout } = await preparePayout(
    actorId,
    sellerId,
    commissionIds,
    "cash",
    db,
  );
  const receivedAt = new Date().toISOString();
  const receiptReference = `CASH-${randomUUID()}`;
  const awaiting = await requireData(
    db
      .from("payouts")
      .update({
        status: "awaiting_confirmation",
        payment_reference: receiptReference,
      })
      .eq("id", payout.id)
      .select()
      .single(),
  );
  await requireData(
    db
      .from("cash_receipts")
      .insert({
        payout_id: payout.id,
        received_by: actorId,
        receipt_reference: receiptReference,
        received_at: receivedAt,
      })
      .select()
      .single(),
  );
  const confirmed = await requireData(
    db
      .from("payouts")
      .update({
        status: "confirmed_received",
        confirmed_at: receivedAt,
        paid_at: receivedAt,
      })
      .eq("id", payout.id)
      .select()
      .single(),
  );
  await requireData(
    db
      .from("payout_batches")
      .update({ status: "completed", completed_at: receivedAt })
      .eq("id", batch.id)
      .select()
      .single(),
  );
  await requireData(
    db
      .from("commissions")
      .update({ status: "paid", paid_at: receivedAt })
      .in("id", commissionIds)
      .select(),
  );
  await audit(db, actorId, "payout.cash_confirmed", "payouts", payout.id, {
    recipientName,
    receiptReference,
    previousStatus: awaiting.status,
  });
  return { batch, payout: confirmed, receiptReference };
}

export async function processRefundAfterPayout(
  actorId: string,
  input: {
    orderId: string;
    paymentId: string;
    amountCents: number;
    reason: string;
  },
  client?: Db,
) {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 1)
    throw new Error("Refund amount must be positive cents");
  const db = database(client);
  const payment = await requireData(
    db
      .from("payments")
      .select("id, order_id, amount_cents, currency, status")
      .eq("id", input.paymentId)
      .single(),
  );
  if (
    payment.order_id !== input.orderId ||
    !["paid", "partially_refunded"].includes(payment.status)
  )
    throw new Error("Refund requires a paid order payment");
  if (input.amountCents > payment.amount_cents)
    throw new Error("Refund exceeds payment amount");
  const refund = await requireData(
    db
      .from("refunds")
      .insert({
        payment_id: payment.id,
        order_id: input.orderId,
        amount_cents: input.amountCents,
        currency: payment.currency,
        reason: input.reason,
        provider_refund_id: `manual-${randomUUID()}`,
        refunded_at: new Date().toISOString(),
        created_by: actorId,
      })
      .select()
      .single(),
  );
  const fullyRefunded = input.amountCents === payment.amount_cents;
  await requireData(
    db
      .from("payments")
      .update({ status: fullyRefunded ? "refunded" : "partially_refunded" })
      .eq("id", payment.id)
      .select()
      .single(),
  );
  if (fullyRefunded) {
    const order = await requireData(
      db.from("orders").select("status").eq("id", input.orderId).single(),
    );
    if (order.status !== "refunded")
      await transitionOrder(db, actorId, input.orderId, "refunded");
  }

  const paidCommissions = await requireData(
    db
      .from("commissions")
      .select("id, amount_cents")
      .eq("order_id", input.orderId)
      .eq("status", "paid"),
  );
  const accounts = await ledgerAccounts(db);
  const adjustments = [];
  for (const commission of paidCommissions) {
    const clawback = Math.min(
      commission.amount_cents,
      Math.round(
        (commission.amount_cents * input.amountCents) / payment.amount_cents,
      ),
    );
    if (!clawback) continue;
    adjustments.push(
      await requireData(
        db
          .from("commission_adjustments")
          .insert({
            commission_id: commission.id,
            amount_cents: -clawback,
            reason: `Refund clawback: ${input.reason}`,
            created_by: actorId,
          })
          .select()
          .single(),
      ),
    );
    const transactionId = randomUUID();
    await requireData(
      db
        .from("ledger_entries")
        .insert([
          {
            transaction_id: transactionId,
            account_id: accounts.bank,
            commission_id: commission.id,
            entry_type: "debit",
            amount_cents: clawback,
            currency: payment.currency,
            description: "Refund commission clawback",
            created_by: actorId,
          },
          {
            transaction_id: transactionId,
            account_id: accounts.payable,
            commission_id: commission.id,
            entry_type: "credit",
            amount_cents: clawback,
            currency: payment.currency,
            description: "Refund commission clawback",
            created_by: actorId,
          },
        ])
        .select(),
    );
  }
  await audit(
    db,
    actorId,
    "refund.processed_after_payout",
    "refunds",
    refund.id,
    {
      orderId: input.orderId,
      adjustmentIds: adjustments.map((adjustment) => adjustment.id),
    },
  );
  return { refund, adjustments };
}
