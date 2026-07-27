import { describe, expect, it } from "vitest";
import { can, permissionsFor } from "@/lib/permissions/matrix";

describe("permissions matrix (Owner RC2 shared roles)", () => {
  it("gives owner full control", () => {
    expect(can("manage_admins", "owner")).toBe(true);
    expect(can("process_payout", "owner")).toBe(true);
    expect(can("view_costs", "owner")).toBe(true);
    expect(permissionsFor("owner")).toContain("approve_seller");
  });

  it("allows admin financial and partner management actions", () => {
    expect(can("process_payout", "admin")).toBe(true);
    expect(can("confirm_payment", "admin")).toBe(true);
    expect(can("view_costs", "admin")).toBe(true);
    expect(can("manage_admins", "admin")).toBe(false);
  });

  it("limits staff to support-scoped actions", () => {
    expect(can("view_costs", "staff")).toBe(false);
    expect(can("process_payout", "staff")).toBe(false);
    expect(can("view_support", "staff")).toBe(true);
    expect(can("view_sellers", "staff")).toBe(true);
  });

  it("limits partners to own-order actions", () => {
    expect(can("create_order", "partner")).toBe(true);
    expect(can("confirm_payment", "partner")).toBe(false);
    expect(can("process_payout", "partner")).toBe(false);
    expect(can("view_costs", "partner")).toBe(false);
  });

  it("denies customer partner-portal mutations", () => {
    expect(permissionsFor("customer")).toEqual([]);
    expect(can("manage_own_profile", "customer")).toBe(false);
  });
});
