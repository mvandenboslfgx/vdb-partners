import { randomUUID } from "crypto";
import type { VerificationProvider, VerificationSession, VerificationStatus } from "@/lib/verification/types";

export class MockVerificationProvider implements VerificationProvider {
  private sessions = new Map<string, VerificationSession>();
  async start(input: { profileId: string; returnUrl: string }) {
    const id = randomUUID(), session = { id, status: "pending" as const, url: `${input.returnUrl}?verification=${id}` };
    this.sessions.set(id, session); return session;
  }
  async getStatus(id: string) { return this.sessions.get(id) ?? { id, status: "not_started" }; }
  setStatus(id: string, status: VerificationStatus) { const current = this.sessions.get(id); if (!current) throw new Error("Unknown verification session"); this.sessions.set(id, { ...current, status }); }
}
