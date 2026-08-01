import { describe, expect, it } from "vitest";
import {
  ADMIN_REVIEW_STAFF_ACTIONS,
  adminReviewStatusCopy,
} from "@/lib/partners/admin-review";
import { ACTIVATION_CHECK_COPY } from "@/lib/partners/activation";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Partners v1 administrative review (Fase 2)", () => {
  it("maps identity statuses to administrative review titles", () => {
    expect(adminReviewStatusCopy("NOT_STARTED").title).toMatch(/niet gestart/i);
    expect(adminReviewStatusCopy("PENDING").title).toMatch(/in beoordeling/i);
    expect(adminReviewStatusCopy("VERIFIED").title).toMatch(/afgerond/i);
    expect(adminReviewStatusCopy("MANUAL_REVIEW").title).toMatch(/Aanpassing/i);
    expect(adminReviewStatusCopy("REJECTED").title).toMatch(/afgewezen/i);
    expect(adminReviewStatusCopy("VERIFIED").body).toMatch(/geen document/i);
    expect(adminReviewStatusCopy("VERIFIED").body).not.toMatch(/KYC-provider|Veriff/i);
  });

  it("staff actions only use allowlisted reason codes", () => {
    for (const action of ADMIN_REVIEW_STAFF_ACTIONS) {
      expect(action.reasonCode).toMatch(/^[A-Z_]+$/);
      expect(action.label).not.toMatch(/upload|camera|selfie|Veriff/i);
    }
  });

  it("IDENTITY_NOT_VERIFIED copy stays administrative", () => {
    expect(ACTIVATION_CHECK_COPY.IDENTITY_NOT_VERIFIED.title).toMatch(
      /Administratieve partnercontrole/i,
    );
  });

  it("admin review action uses user session RPC (not service role)", () => {
    const src = readFileSync(
      join(process.cwd(), "app/actions/admin-review.ts"),
      "utf8",
    );
    expect(src).toMatch(/staff_attest_partner_admin_review/);
    expect(src).toMatch(/createClient/);
    expect(src).not.toMatch(/createAdminClient/);
    expect(src).toMatch(/AAL2_REQUIRED/);
  });

  it("onboarding and admin UI expose no file/camera IDV CTA", () => {
    const onboarding = readFileSync(
      join(process.cwd(), "app/(seller)/onboarding/page.tsx"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "components/admin/admin-review-panel.tsx"),
      "utf8",
    );
    expect(onboarding).toMatch(/admin-review-status/);
    expect(onboarding).not.toMatch(/type=["']file["']/);
    expect(panel).not.toMatch(/type=["']file["']/);
    expect(panel).not.toMatch(/getUserMedia/);
    expect(panel).toMatch(/geen ID-document/);
  });
});
