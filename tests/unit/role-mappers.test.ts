import { describe, expect, it } from "vitest";
import {
  mapAdminRoleToShared,
  mapPartnerStatusToShared,
  pickPrimaryRole,
} from "@/lib/contract/roles";

describe("RC2 role mappers", () => {
  it("maps admin_roles enum to shared roles", () => {
    expect(mapAdminRoleToShared("OWNER")).toBe("owner");
    expect(mapAdminRoleToShared("ADMIN")).toBe("admin");
    expect(mapAdminRoleToShared("SUPPORT")).toBe("staff");
    expect(mapAdminRoleToShared("CONTENT")).toBe("staff");
    expect(mapAdminRoleToShared("seller")).toBeNull();
  });

  it("maps partner_profiles status to shared roles", () => {
    expect(mapPartnerStatusToShared("ACTIVE")).toBe("partner");
    expect(mapPartnerStatusToShared("PENDING")).toBe("partner_pending");
    expect(mapPartnerStatusToShared("SUSPENDED")).toBeNull();
    expect(mapPartnerStatusToShared("REVOKED")).toBeNull();
  });

  it("picks highest-privilege shared role", () => {
    expect(pickPrimaryRole(["customer", "partner", "admin"])).toBe("admin");
    expect(pickPrimaryRole(["partner_pending", "customer"])).toBe(
      "partner_pending",
    );
    expect(pickPrimaryRole([])).toBeNull();
  });
});
