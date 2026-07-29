import { describe, expect, it } from "vitest";
import {
  derivePartnerFacingStatus,
  parseActivationChecklist,
  PARTNER_FACING_STATUS_COPY,
} from "@/lib/partners/activation";
import { decidePartnerCapability } from "@/lib/partners/capabilities";

describe("activation status mapping", () => {
  it("maps pending/submitted/active/suspended/rejected/unknown fail-closed", () => {
    expect(derivePartnerFacingStatus({ applicationStatus: "SUBMITTED" })).toBe(
      "submitted",
    );
    expect(
      derivePartnerFacingStatus({
        profileStatus: "PENDING",
        applicationStatus: "IN_REVIEW",
      }),
    ).toBe("in_review");
    expect(derivePartnerFacingStatus({ profileStatus: "ACTIVE" })).toBe(
      "active",
    );
    expect(derivePartnerFacingStatus({ profileStatus: "SUSPENDED" })).toBe(
      "suspended",
    );
    expect(derivePartnerFacingStatus({ applicationStatus: "REJECTED" })).toBe(
      "rejected",
    );
    expect(
      derivePartnerFacingStatus({ profileStatus: "WEIRD_NEW_STATUS" }),
    ).toBe("unknown_safe");
    expect(PARTNER_FACING_STATUS_COPY.unknown_safe.title).toMatch(/niet/i);
  });

  it("treats staff-approved but incomplete compliance as not active", () => {
    expect(
      derivePartnerFacingStatus({
        profileStatus: "PENDING",
        applicationStatus: "APPROVED",
        missing: ["IDENTITY_NOT_VERIFIED", "AGREEMENT_NOT_ACCEPTED"],
      }),
    ).toBe("compliance_incomplete");
  });

  it("parses checklist shape", () => {
    const checklist = parseActivationChecklist({
      can_activate: false,
      missing: ["AGE_NOT_VERIFIED"],
      checks: { age: false },
    });
    expect(checklist?.canActivate).toBe(false);
    expect(checklist?.missing).toEqual(["AGE_NOT_VERIFIED"]);
  });
});

describe("capability gating", () => {
  it("denies sales actions for pending/suspended/unknown", () => {
    expect(
      decidePartnerCapability("create_lead", { profileStatus: "PENDING" })
        .allowed,
    ).toBe(false);
    expect(
      decidePartnerCapability("confirm_sale", { profileStatus: "SUSPENDED" })
        .allowed,
    ).toBe(false);
    expect(
      decidePartnerCapability("claim_commission", {
        facingStatus: "unknown_safe",
      }).allowed,
    ).toBe(false);
    expect(
      decidePartnerCapability("referral_action", {
        facingStatus: "compliance_incomplete",
      }).allowed,
    ).toBe(false);
  });

  it("allows catalog/lead only for ACTIVE", () => {
    expect(
      decidePartnerCapability("view_catalog", { profileStatus: "ACTIVE" })
        .allowed,
    ).toBe(true);
    expect(
      decidePartnerCapability("create_lead", { profileStatus: "ACTIVE" })
        .allowed,
    ).toBe(true);
  });

  it("keeps payout execution disabled even when ACTIVE", () => {
    expect(
      decidePartnerCapability("payout_action", { profileStatus: "ACTIVE" }),
    ).toEqual({ allowed: false, reason: "payout_disabled" });
  });

  it("allows support for suspended partners per policy", () => {
    expect(
      decidePartnerCapability("support_own_tickets", {
        profileStatus: "SUSPENDED",
      }).allowed,
    ).toBe(true);
  });
});
