import { describe, expect, it } from "vitest";
import { ACTIVATION_CHECK_COPY } from "@/lib/partners/activation";
import { MockVerificationProvider } from "@/lib/verification/mock";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Partners v1 IDV de-scope copy", () => {
  it("IDENTITY_NOT_VERIFIED uses administrative review wording", () => {
    const copy = ACTIVATION_CHECK_COPY.IDENTITY_NOT_VERIFIED;
    expect(copy.title).toMatch(/Administratieve partnercontrole/i);
    expect(copy.body).toMatch(/administratief beoordeeld/i);
    expect(copy.body).toMatch(/geen automatische ID-check/i);
    expect(copy.body).not.toMatch(/KYC-provider/i);
    expect(copy.selfService).toBe(false);
  });

  it("onboarding page has no kyc-unavailable / camera upload CTA", () => {
    const src = readFileSync(
      join(process.cwd(), "app/(seller)/onboarding/page.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/kyc-unavailable/);
    expect(src).toMatch(/admin-review-notice/);
    expect(src).not.toMatch(/type=["']file["']/);
    expect(src).not.toMatch(/getUserMedia|selfie|liveness/i);
  });

  it("auth register notices do not promise automatic IDV", () => {
    const src = readFileSync(
      join(process.cwd(), "components/forms/auth-forms.tsx"),
      "utf8",
    );
    expect(src).toMatch(/geen automatische/i);
    expect(src).toMatch(/ID-check/i);
    expect(src).not.toMatch(/KYC-provider|geen KYC|Voltooi de verificatie/i);
  });

  it("startVerification is quarantined in source", () => {
    const src = readFileSync(
      join(process.cwd(), "app/actions/seller-onboarding.ts"),
      "utf8",
    );
    const startFn = src.slice(
      src.indexOf("export async function startVerification"),
      src.indexOf("export async function acceptAgreement"),
    );
    expect(startFn).toMatch(/QUARANTINED: automatic identity verification/);
    expect(startFn).not.toMatch(/seller_verifications/);
    expect(startFn).not.toMatch(/configured_provider/);
  });

  it("mock verification provider fails closed", async () => {
    const mock = new MockVerificationProvider();
    await expect(
      mock.start({ profileId: "x", returnUrl: "https://example.test" }),
    ).rejects.toThrow(/QUARANTINED/i);
  });
});
