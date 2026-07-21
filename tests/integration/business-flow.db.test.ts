import { beforeAll, describe, expect, it } from "vitest";
import { createTestAdminClient, createAuthUser } from "@/tests/helpers/db";
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
  processRefundAfterPayout,
  releaseCommissionsNow,
  setCommissionHoldDays,
} from "@/lib/workflows/finance";

const isLocalDatabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("54421")
  && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!isLocalDatabase)("database-backed partner finance business flow", () => {
  const db = createTestAdminClient();
  let ownerId = "";
  let financeId = "";
  let bankSellerId = "";
  let bankOrderId = "";
  let bankPaymentId = "";
  let bankCommissionId = "";
  let bankPayoutId = "";

  beforeAll(async () => {
    ownerId = (await createAuthUser({ role: "owner" })).id;
    financeId = (await createAuthUser({ role: "finance_admin" })).id;
    await setCommissionHoldDays(0);
  });

  it("runs onboarding through a paid bank payout with balanced ledger entries", async () => {
    const sellerUser = await createAuthUser({ role: "seller" });
    const seller = await onboardSeller(sellerUser.id, {
      name: "Bank Seller",
      payout: "bank_transfer",
      iban: "NL91ABNA0417164300",
      accountHolder: "Bank Seller",
    });
    expect(seller.status).toBe("pending_review");
    const approved = await approveSeller(ownerId, seller.id, "Manual review approved");
    expect(approved.status).toBe("approved");
    bankSellerId = approved.id;

    const order = await createSellerOrder(sellerUser.id, {
      customerName: "Bank Customer",
      customerEmail: `bank-customer-${sellerUser.id}@example.test`,
      variantId: "21000000-0000-0000-0000-000000000001",
      quantity: 1,
    });
    bankOrderId = order.id;
    await advanceOrderToAwaitingPayment(financeId, order.id);
    const payment = await createAndConfirmManualBankPayment(financeId, order.id);
    bankPaymentId = payment.id;
    await confirmOrderDelivered(financeId, order.id, "DELIVERY-BANK-1");
    const [commission] = await createCommissionsForOrder(financeId, order.id);
    expect(commission.status).toBe("pending");
    const released = await releaseCommissionsNow(financeId);
    bankCommissionId = released.find((row) => row.id === commission.id)?.id ?? "";
    expect(bankCommissionId).toBe(commission.id);

    const payoutResult = await createBankPayoutForCommissions(financeId, bankSellerId, [commission.id]);
    bankPayoutId = payoutResult.payout.id;
    expect(payoutResult.payout.status).toBe("paid");

    const [{ data: persistedCommission }, { data: ledger }] = await Promise.all([
      db.from("commissions").select("status, amount_cents").eq("id", commission.id).single(),
      db.from("ledger_entries").select("entry_type, amount_cents, payout_id").eq("payout_id", payoutResult.payout.id),
    ]);
    expect(persistedCommission?.status).toBe("paid");
    expect(ledger).toHaveLength(2);
    expect(ledger?.reduce((total, row) => total + (row.entry_type === "debit" ? row.amount_cents : -row.amount_cents), 0)).toBe(0);
  }, 60_000);

  it("confirms a cash payout with a schema-backed receipt", async () => {
    const sellerUser = await createAuthUser({ role: "seller" });
    const seller = await approveSeller(ownerId, (await onboardSeller(sellerUser.id, {
      name: "Cash Seller",
      payout: "cash",
    })).id, "Manual review approved");
    const order = await createSellerOrder(sellerUser.id, {
      customerName: "Cash Customer",
      customerEmail: `cash-customer-${sellerUser.id}@example.test`,
      variantId: "21000000-0000-0000-0000-000000000001",
      quantity: 1,
    });
    await advanceOrderToAwaitingPayment(financeId, order.id);
    await createAndConfirmManualBankPayment(financeId, order.id);
    await confirmOrderDelivered(financeId, order.id, "DELIVERY-CASH-1");
    const [commission] = await createCommissionsForOrder(financeId, order.id);
    await releaseCommissionsNow(financeId);
    const payoutResult = await createCashPayoutAndConfirm(financeId, seller.id, [commission.id], "Cash Seller");
    expect(payoutResult.payout.status).toBe("confirmed_received");
    const { data: receipt } = await db.from("cash_receipts")
      .select("payout_id, received_by, receipt_reference, received_at")
      .eq("payout_id", payoutResult.payout.id)
      .single();
    expect(receipt?.received_by).toBe(financeId);
    expect(receipt?.receipt_reference).toBe(payoutResult.receiptReference);
  }, 60_000);

  it("keeps the paid payout and creates compensating refund records", async () => {
    const { data: beforePayout } = await db.from("payouts").select("id, status").eq("id", bankPayoutId).single();
    expect(beforePayout?.status).toBe("paid");
    const result = await processRefundAfterPayout(financeId, {
      orderId: bankOrderId,
      paymentId: bankPaymentId,
      amountCents: 6049,
      reason: "Customer cancellation after settlement",
    });
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0].amount_cents).toBeLessThan(0);

    const [{ data: payout }, { data: adjustment }, { data: entries }, { data: commission }] = await Promise.all([
      db.from("payouts").select("id, status").eq("id", bankPayoutId).single(),
      db.from("commission_adjustments").select("amount_cents").eq("commission_id", bankCommissionId),
      db.from("ledger_entries").select("commission_id, entry_type, amount_cents").eq("commission_id", bankCommissionId),
      db.from("commissions").select("status").eq("id", bankCommissionId).single(),
    ]);
    expect(payout?.status).toBe("paid");
    expect(adjustment?.some((row) => row.amount_cents < 0)).toBe(true);
    expect(entries?.length).toBeGreaterThanOrEqual(2);
    expect(commission?.status).toBe("paid");
    await expect(createBankPayoutForCommissions(financeId, bankSellerId, [bankCommissionId])).rejects.toThrow("available");
  }, 60_000);});
