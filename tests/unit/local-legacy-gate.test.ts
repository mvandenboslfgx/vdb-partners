import { describe, expect, it } from "vitest";
import { assertLocalLegacySellerDomainAllowed } from "@/lib/contract/local-legacy";

describe("local legacy seller domain gate", () => {
  it("allows local docker URLs", () => {
    expect(() =>
      assertLocalLegacySellerDomainAllowed("http://127.0.0.1:54421"),
    ).not.toThrow();
  });

  it("blocks staging and production remote URLs", () => {
    expect(() =>
      assertLocalLegacySellerDomainAllowed(
        "https://qzekuvmgfekzsowdecyk.supabase.co",
      ),
    ).toThrow(/disabled against Owner RC2/);
    expect(() =>
      assertLocalLegacySellerDomainAllowed(
        "https://nhsrdnjfsxfikfbdmdfj.supabase.co",
      ),
    ).toThrow(/denylisted/);
  });
});
