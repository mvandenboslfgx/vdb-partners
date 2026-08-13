import { beforeEach, describe, expect, it } from "vitest";
import {
  buildRateLimitKey,
  rateLimit,
  resetRateLimitBucketsForTests,
} from "@/lib/security/rate-limit";

describe("rateLimit helper", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
  });

  it("builds IP/email-ish keys without requiring secrets", () => {
    expect(
      buildRateLimitKey("auth:register", {
        ip: "203.0.113.10",
        email: "Partner@Example.TEST",
      }),
    ).toBe("auth:register:203.0.113.10:partner@example.test");
  });

  it("blocks after the configured limit within the window", () => {
    const key = buildRateLimitKey("auth:sign-in", {
      ip: "198.51.100.2",
      email: "a@b.test",
    });
    expect(rateLimit(key, { limit: 2, windowMs: 60_000 }).success).toBe(true);
    expect(rateLimit(key, { limit: 2, windowMs: 60_000 }).success).toBe(true);
    expect(rateLimit(key, { limit: 2, windowMs: 60_000 }).success).toBe(false);
  });
});
