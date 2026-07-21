import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  buildRlsFixture,
  canRunLiveJwtRls,
  expectDeleteIneffective,
  expectInvisible,
  expectMutationDenied,
  expectUpdateIneffective,
  expectVisible,
  type RlsFixture,
} from "@/tests/helpers/rls";

describe.skipIf(!canRunLiveJwtRls())("JWT/RLS access matrix by role (live tokens)", () => {
  let fx: RlsFixture;

  beforeAll(async () => {
    fx = await buildRlsFixture();
    expect(fx.sellerA.accessToken).toBeTruthy();
    expect(fx.sellerB.accessToken).toBeTruthy();
    expect(fx.owner.accessToken).toBeTruthy();
  }, 180_000);

  describe("authentication facts", () => {
    it("resolves roles from user_roles via SECURITY DEFINER helpers, not client metadata", async () => {
      const { data: role, error } = await fx.sellerA.client.rpc("current_user_role");
      expect(error).toBeNull();
      expect(role).toBe("seller");
      const { data: sellerId, error: sellerError } = await fx.sellerA.client.rpc("current_seller_id");
      expect(sellerError).toBeNull();
      expect(sellerId).toBe(fx.sellerA.sellerProfileId);
      const { data: blockedSellerId } = await fx.blocked.client.rpc("current_seller_id");
      expect(blockedSellerId).toBeNull();
    });

    it("documents role priority owner > finance_admin > sales_admin > support_admin > seller", async () => {
      const { data: ownerRole } = await fx.owner.client.rpc("current_user_role");
      const { data: financeRole } = await fx.finance.client.rpc("current_user_role");
      const { data: salesRole } = await fx.sales.client.rpc("current_user_role");
      const { data: supportRole } = await fx.support.client.rpc("current_user_role");
      expect(ownerRole).toBe("owner");
      expect(financeRole).toBe("finance_admin");
      expect(salesRole).toBe("sales_admin");
      expect(supportRole).toBe("support_admin");
    });
  });

  describe("owner positives", () => {
    it("can select sellers, orders, payments, commissions, payouts, ledger, costs, notes, audits", async () => {
      await expectVisible(fx.owner.client, "seller_profiles", fx.sellerB.sellerProfileId!);
      await expectVisible(fx.owner.client, "orders", fx.seed.orderBId);
      await expectVisible(fx.owner.client, "commissions", fx.seed.commissionBId);
      await expectVisible(fx.owner.client, "payouts", fx.seed.payoutBId);
      await expectVisible(fx.owner.client, "ledger_entries", fx.seed.ledgerEntryId);
      await expectVisible(fx.owner.client, "product_costs", fx.seed.productCostId);
      await expectVisible(fx.owner.client, "admin_notes", fx.seed.adminNoteId);
      await expectVisible(fx.owner.client, "audit_logs", fx.seed.auditLogId);
      await expectVisible(fx.owner.client, "customers", fx.seed.customerBId);
    });
  });

  describe("finance admin positives and negatives", () => {
    it("can select payments, commissions, payouts, ledger and product costs", async () => {
      await expectVisible(fx.finance.client, "commissions", fx.seed.commissionBId);
      await expectVisible(fx.finance.client, "payouts", fx.seed.payoutBId);
      await expectVisible(fx.finance.client, "ledger_entries", fx.seed.ledgerEntryId);
      await expectVisible(fx.finance.client, "product_costs", fx.seed.productCostId);
      await expectVisible(fx.finance.client, "cash_receipts", fx.seed.cashReceiptBId);
    });

    it("cannot assign owner roles or mutate agreement versions", async () => {
      await expectMutationDenied(
        fx.finance.client.from("user_roles").insert({ user_id: fx.sellerA.userId, role: "owner" }).select("user_id"),
        "finance assign owner role",
      );
      await expectUpdateIneffective(
        fx.finance.client,
        "partner_agreement_versions",
        fx.seed.agreementVersionId,
        { title: "Hijacked" },
        "finance mutate agreement version",
      );
    });

    it("cannot delete audit logs", async () => {
      await expectDeleteIneffective(
        fx.finance.client,
        "audit_logs",
        fx.seed.auditLogId,
        "finance delete audit log",
      );
    });
  });

  describe("sales admin positives and negatives", () => {
    it("can select sellers and orders", async () => {
      await expectVisible(fx.sales.client, "seller_profiles", fx.sellerA.sellerProfileId!);
      await expectVisible(fx.sales.client, "orders", fx.seed.orderBId);
      await expectVisible(fx.sales.client, "products", fx.seed.productId);
    });

    it("cannot select product_costs or ledger_entries, cannot manage roles or finalize payouts", async () => {
      await expectInvisible(fx.sales.client, "product_costs", fx.seed.productCostId);
      await expectInvisible(fx.sales.client, "ledger_entries", fx.seed.ledgerEntryId);
      await expectMutationDenied(
        fx.sales.client.from("user_roles").insert({ user_id: fx.sellerA.userId, role: "finance_admin" }).select("user_id"),
        "sales create finance_admin",
      );
      await expectUpdateIneffective(
        fx.sales.client,
        "payouts",
        fx.seed.payoutBId,
        { status: "draft" },
        "sales force payout mutation",
      );
    });
  });

  describe("support admin positives and negatives", () => {
    it("can select support tickets and limited order data", async () => {
      await expectVisible(fx.support.client, "support_tickets", fx.seed.ticketBId);
      await expectVisible(fx.support.client, "orders", fx.seed.orderBId);
    });

    it("cannot select product_costs, mutate commissions/payouts/payments, manage roles, or approve sellers", async () => {
      await expectInvisible(fx.support.client, "product_costs", fx.seed.productCostId);
      await expectUpdateIneffective(
        fx.support.client,
        "commissions",
        fx.seed.commissionBId,
        { amount_cents: 1 },
        "support mutate commission",
      );
      await expectUpdateIneffective(
        fx.support.client,
        "payouts",
        fx.seed.payoutBId,
        { status: "draft" },
        "support mutate payout",
      );
      await expectUpdateIneffective(
        fx.support.client,
        "payments",
        (
          await fx.admin.from("payments").select("id").eq("order_id", fx.seed.orderBId).single()
        ).data!.id,
        { status: "pending" },
        "support mutate payment",
      );
      await expectMutationDenied(
        fx.support.client.from("user_roles").insert({ user_id: fx.sellerA.userId, role: "owner" }).select("user_id"),
        "support assign owner",
      );
      await expectUpdateIneffective(
        fx.support.client,
        "seller_profiles",
        fx.pending.sellerProfileId!,
        { status: "approved" },
        "support approve seller",
      );
    });
  });

  describe("seller A positives", () => {
    it("can read own profile, products, and create a support ticket", async () => {
      await expectVisible(fx.sellerA.client, "seller_profiles", fx.sellerA.sellerProfileId!);
      await expectVisible(fx.sellerA.client, "products", fx.seed.productId);
      const { data: ticket, error } = await fx.sellerA.client
        .from("support_tickets")
        .insert({
          opened_by: fx.sellerA.userId,
          seller_id: fx.sellerA.sellerProfileId,
          subject: `RLS A ticket ${randomUUID().slice(0, 8)}`,
        })
        .select("id")
        .single();
      expect(error).toBeNull();
      expect(ticket?.id).toBeTruthy();
    });
  });

  describe("seller A versus seller B isolation", () => {
    it("hides seller B commercial and support data from seller A", async () => {
      await expectInvisible(fx.sellerA.client, "seller_profiles", fx.sellerB.sellerProfileId!);
      await expectInvisible(fx.sellerA.client, "orders", fx.seed.orderBId);
      await expectInvisible(fx.sellerA.client, "commissions", fx.seed.commissionBId);
      await expectInvisible(fx.sellerA.client, "payouts", fx.seed.payoutBId);
      await expectInvisible(fx.sellerA.client, "cash_receipts", fx.seed.cashReceiptBId);
      await expectInvisible(fx.sellerA.client, "support_tickets", fx.seed.ticketBId);
      await expectInvisible(fx.sellerA.client, "notifications", fx.seed.notificationBId);
      await expectInvisible(fx.sellerA.client, "customers", fx.seed.customerBId);
    });

    it("lets seller B see own commercial trail that was seeded for isolation proofs", async () => {
      await expectVisible(fx.sellerB.client, "orders", fx.seed.orderBId);
      await expectVisible(fx.sellerB.client, "commissions", fx.seed.commissionBId);
      await expectVisible(fx.sellerB.client, "payouts", fx.seed.payoutBId);
      await expectVisible(fx.sellerB.client, "cash_receipts", fx.seed.cashReceiptBId);
      await expectVisible(fx.sellerB.client, "support_tickets", fx.seed.ticketBId);
      await expectVisible(fx.sellerB.client, "notifications", fx.seed.notificationBId);
    });
  });

  describe("seller financial restrictions", () => {
    it("denies costs, ledger, audit, admin notes, payment verification, payout creation, role/status escalation", async () => {
      await expectInvisible(fx.sellerA.client, "product_costs", fx.seed.productCostId);
      await expectInvisible(fx.sellerA.client, "ledger_entries", fx.seed.ledgerEntryId);
      await expectInvisible(fx.sellerA.client, "audit_logs", fx.seed.auditLogId);
      await expectInvisible(fx.sellerA.client, "admin_notes", fx.seed.adminNoteId);

      const paymentId = (await fx.admin.from("payments").select("id").eq("order_id", fx.seed.orderBId).single()).data!.id;
      await expectUpdateIneffective(
        fx.sellerA.client,
        "payments",
        paymentId,
        { status: "paid", verified_at: new Date().toISOString() },
        "seller mark payment verified",
      );
      await expectMutationDenied(
        fx.sellerA.client.from("fulfilments").insert({
          order_id: fx.seed.orderBId,
          status: "delivered",
          delivery_reference: "FAKE",
          delivered_at: new Date().toISOString(),
        }).select("id"),
        "seller confirm fulfilment",
      );
      await expectUpdateIneffective(
        fx.sellerA.client,
        "commissions",
        fx.seed.commissionBId,
        { amount_cents: 99999 },
        "seller set commission amount",
      );
      await expectMutationDenied(
        fx.sellerA.client.from("payouts").insert({
          seller_id: fx.sellerA.sellerProfileId,
          method: "cash",
          status: "paid",
          currency: "EUR",
          total_amount_cents: 100,
        }).select("id"),
        "seller create payout",
      );
      await expectMutationDenied(
        fx.sellerA.client.from("cash_receipts").insert({
          payout_id: fx.seed.payoutBId,
          received_by: fx.sellerA.userId,
          receipt_reference: `FAKE-${randomUUID()}`,
          received_at: new Date().toISOString(),
        }).select("id"),
        "seller forge cash receipt",
      );
      await expectMutationDenied(
        fx.sellerA.client.from("refunds").insert({
          payment_id: paymentId,
          order_id: fx.seed.orderBId,
          amount_cents: 100,
          currency: "EUR",
          reason: "fake",
        }).select("id"),
        "seller create refund",
      );
      await expectMutationDenied(
        fx.sellerA.client.from("user_roles").insert({ user_id: fx.sellerA.userId, role: "owner" }).select("user_id"),
        "seller self-elevate role",
      );
      await expectUpdateIneffective(
        fx.sellerA.client,
        "seller_profiles",
        fx.sellerA.sellerProfileId!,
        { status: "blocked" },
        "seller self-change status",
      );
    });

    it("denies direct order insert via JWT (orders are created through privileged workflows)", async () => {
      await expectMutationDenied(
        fx.sellerA.client.from("orders").insert({
          customer_id: fx.seed.customerBId,
          seller_id: fx.sellerA.sellerProfileId,
          status: "submitted",
          currency: "EUR",
          subtotal_cents: 100,
          tax_cents: 21,
          total_cents: 121,
        }),
        "seller JWT insert order",
      );
    });
  });

  describe("pending seller", () => {
    it("can read own onboarding profile and agreement versions", async () => {
      await expectVisible(fx.pending.client, "seller_profiles", fx.pending.sellerProfileId!);
      const { data: versions, error } = await fx.pending.client
        .from("partner_agreement_versions")
        .select("id")
        .eq("id", fx.seed.agreementVersionId);
      expect(error).toBeNull();
      expect(versions?.length).toBeGreaterThan(0);
    });

    it("cannot use approved catalogue or commercial tables", async () => {
      await expectInvisible(fx.pending.client, "products", fx.seed.productId);
      await expectInvisible(fx.pending.client, "orders", fx.seed.orderBId);
      await expectInvisible(fx.pending.client, "commissions", fx.seed.commissionBId);
      await expectInvisible(fx.pending.client, "payouts", fx.seed.payoutBId);
    });
  });

  describe("suspended seller", () => {
    it("can read historical own orders but cannot use catalogue for new sales", async () => {
      await expectVisible(fx.suspended.client, "orders", fx.seed.suspendedOrderId);
      await expectInvisible(fx.suspended.client, "products", fx.seed.productId);
      await expectMutationDenied(
        fx.suspended.client.from("seller_referrals").insert({
          seller_id: fx.suspended.sellerProfileId,
          referral_code: `RLS-${randomUUID().slice(0, 6)}`,
        }),
        "suspended create referral",
      );
    });
  });

  describe("blocked seller", () => {
    it("cannot read commercial data or seller-scoped helpers", async () => {
      const { data: sellerId } = await fx.blocked.client.rpc("current_seller_id");
      expect(sellerId).toBeNull();
      await expectInvisible(fx.blocked.client, "orders", fx.seed.orderBId);
      await expectInvisible(fx.blocked.client, "products", fx.seed.productId);
      await expectInvisible(fx.blocked.client, "commissions", fx.seed.commissionBId);
      await expectMutationDenied(
        fx.blocked.client.from("support_tickets").insert({
          opened_by: fx.blocked.userId,
          seller_id: fx.blocked.sellerProfileId,
          subject: "blocked should fail",
        }),
        "blocked open ticket with seller_id",
      );
    });
  });

  describe("SECURITY DEFINER and grants", () => {
    it("exposes role helpers to authenticated JWT callers with fixed search_path semantics", async () => {
      const { data: isAdmin } = await fx.owner.client.rpc("is_admin");
      const { data: isFinance } = await fx.finance.client.rpc("is_finance_admin");
      const { data: sellerIsFinance } = await fx.sellerA.client.rpc("is_finance_admin");
      expect(isAdmin).toBe(true);
      expect(isFinance).toBe(true);
      expect(sellerIsFinance).toBe(false);
    });
  });
});
