import { beforeEach, describe, expect, it, vi } from "vitest";

const isFeatureEnabled = vi.fn();
const rateLimit = vi.fn();
const buildRateLimitKey = vi.fn(
  (scope: string, parts: { ip?: string | null; email?: string | null }) =>
    `${scope}:${parts.ip ?? "unknown"}:${parts.email ?? "-"}`,
);
const assertPartnerSupabaseEnvironment = vi.fn();
const signUp = vi.fn();
const rpc = vi.fn();
const createClient = vi.fn(async () => ({
  auth: { signUp },
  rpc,
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (...args: [string]) => isFeatureEnabled(...args),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: (...args: [string, { limit?: number; windowMs?: number }?]) =>
    rateLimit(...args),
  buildRateLimitKey: (
    ...args: [string, { ip?: string | null; email?: string | null }]
  ) => buildRateLimitKey(...args),
}));

vi.mock("@/lib/contract/env", () => ({
  assertPartnerSupabaseEnvironment: (...args: [string | undefined]) =>
    assertPartnerSupabaseEnvironment(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClient(),
}));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      "x-forwarded-for": "203.0.113.10",
    }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("registerPartner seller_registration_enabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockReturnValue({
      success: true,
      remaining: 4,
      resetAt: Date.now() + 60_000,
    });
    signUp.mockResolvedValue({
      data: { user: { id: "user-1", email: "partner@example.test" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it("blocks registration when flag is false without creating an auth user", async () => {
    isFeatureEnabled.mockResolvedValue(false);
    const { registerPartner } = await import("@/app/actions/auth");

    const form = new FormData();
    form.set("email", "partner@example.test");
    form.set("password", "password123");
    form.set("name", "Jan Jansen");
    form.set("partnerType", "INDIVIDUAL");

    const result = await registerPartner({}, form);

    expect(isFeatureEnabled).toHaveBeenCalledWith("seller_registration_enabled");
    expect(result.error).toMatch(/uitgeschakeld/i);
    expect(signUp).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("allows registration path when flag is true (attempts auth signUp)", async () => {
    isFeatureEnabled.mockResolvedValue(true);
    const { registerPartner } = await import("@/app/actions/auth");

    const form = new FormData();
    form.set("email", "partner@example.test");
    form.set("password", "password123");
    form.set("name", "Jan Jansen");
    form.set("partnerType", "INDIVIDUAL");

    const result = await registerPartner({}, form);

    expect(isFeatureEnabled).toHaveBeenCalledWith("seller_registration_enabled");
    expect(signUp).toHaveBeenCalled();
    expect(result.success).toMatch(/e-mail/i);
    expect(result.error).toBeUndefined();
  });
});
