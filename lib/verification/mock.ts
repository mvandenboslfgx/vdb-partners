/**
 * QUARANTINED — not part of the active Partners v1 product path.
 * No runtime importer references MockVerificationProvider (verified Phase 1).
 * Kept only so accidental imports fail closed instead of simulating IDV success.
 */
import type {
  VerificationProvider,
  VerificationSession,
  VerificationStatus,
} from "@/lib/verification/types";

function quarantined(): never {
  throw new Error(
    "QUARANTINED: MockVerificationProvider is disabled for Partners v1 (no automatic IDV)",
  );
}

export class MockVerificationProvider implements VerificationProvider {
  async start(_input: {
    profileId: string;
    returnUrl: string;
  }): Promise<VerificationSession> {
    void _input;
    return quarantined();
  }
  async getStatus(_id: string): Promise<VerificationSession> {
    void _id;
    return quarantined();
  }
  setStatus(_id: string, _status: VerificationStatus): void {
    void _id;
    void _status;
    quarantined();
  }
}
