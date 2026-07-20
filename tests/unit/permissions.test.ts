import { describe, expect, it } from "vitest";
import { can, permissionsFor } from "@/lib/permissions/matrix";

describe("permissions matrix", () => {
  it("gives owner full control", () => {
    expect(can("manage_admins", "owner")).toBe(true);
    expect(can("process_payout", "owner")).toBe(true);
    expect(can("view_costs", "owner")).toBe(true);
    expect(permissionsFor("owner")).toContain("approve_seller");
  });

  it("allows finance to process payouts and view costs", () => {
    expect(can("process_payout", "finance_admin")).toBe(true);
    expect(can("confirm_payment", "finance_admin")).toBe(true);
    expect(can("view_costs", "finance_admin")).toBe(true);
    expect(can("manage_admins", "finance_admin")).toBe(false);
  });

  it("blocks sales admin from costs and payouts", () => {
    expect(can("view_costs", "sales_admin")).toBe(false);
    expect(can("process_payout", "sales_admin")).toBe(false);
    expect(can("approve_seller", "sales_admin")).toBe(true);
  });

  it("blocks support from financial mutations", () => {
    expect(can("confirm_payment", "support_admin")).toBe(false);
    expect(can("process_payout", "support_admin")).toBe(false);
    expect(can("view_costs", "support_admin")).toBe(false);
  });

  it("limits sellers to own-order actions", () => {
    expect(can("create_order", "seller")).toBe(true);
    expect(can("confirm_payment", "seller")).toBe(false);
    expect(can("process_payout", "seller")).toBe(false);
    expect(can("view_costs", "seller")).toBe(false);
  });
});
