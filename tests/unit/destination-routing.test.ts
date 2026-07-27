import { describe, expect, it } from "vitest";
import { destinationForIdentity } from "@/lib/auth/destination";
import type { PartnerIdentity } from "@/lib/auth/identity";

function identity(partial: Partial<PartnerIdentity>): PartnerIdentity {
  return {
    userId: "user-1",
    email: "user@example.test",
    roles: [],
    primaryRole: null,
    adminRole: null,
    partnerProfileId: null,
    partnerStatus: null,
    partnerDisplayName: null,
    isCustomerMember: false,
    partnerBlocked: false,
    ...partial,
  };
}

describe("destinationForIdentity", () => {
  it("routes owner/admin/staff to /admin", () => {
    expect(
      destinationForIdentity(
        identity({ primaryRole: "owner", roles: ["owner"] }),
      ).path,
    ).toBe("/admin");
    expect(
      destinationForIdentity(
        identity({ primaryRole: "admin", roles: ["admin"] }),
      ).path,
    ).toBe("/admin");
    expect(
      destinationForIdentity(
        identity({ primaryRole: "staff", roles: ["staff"] }),
      ).path,
    ).toBe("/admin");
  });

  it("routes ACTIVE partner to dashboard", () => {
    expect(
      destinationForIdentity(
        identity({
          primaryRole: "partner",
          roles: ["partner"],
          partnerStatus: "ACTIVE",
          partnerProfileId: "p1",
        }),
      ),
    ).toMatchObject({ path: "/dashboard", reason: "partner_dashboard" });
  });

  it("routes PENDING partner to onboarding", () => {
    expect(
      destinationForIdentity(
        identity({
          primaryRole: "partner_pending",
          roles: ["partner_pending"],
          partnerStatus: "PENDING",
          partnerProfileId: "p1",
        }),
      ),
    ).toMatchObject({ path: "/onboarding", reason: "partner_pending" });
  });

  it("denies customer accounts from partner dashboard", () => {
    expect(
      destinationForIdentity(
        identity({
          primaryRole: "customer",
          roles: ["customer"],
          isCustomerMember: true,
        }),
      ),
    ).toMatchObject({
      path: "/geen-toegang?reden=klant",
      reason: "customer_denied",
    });
  });

  it("blocks suspended/revoked partners", () => {
    expect(
      destinationForIdentity(
        identity({ partnerBlocked: true, partnerStatus: "SUSPENDED" }),
      ),
    ).toMatchObject({
      path: "/geen-toegang?reden=geschorst",
      reason: "partner_blocked",
    });
  });

  it("fails controlled for incomplete identity", () => {
    expect(
      destinationForIdentity(identity({ primaryRole: null, roles: [] })),
    ).toMatchObject({
      path: "/geen-toegang?reden=onvolledig",
      reason: "incomplete",
    });
  });
});
