export const verificationStatuses = ["not_started", "pending", "requires_action", "verified", "rejected", "expired", "manual_review"] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];
export interface VerificationSession { id: string; status: VerificationStatus; url?: string; expiresAt?: Date; }
export interface VerificationProvider {
  start(input: { profileId: string; returnUrl: string }): Promise<VerificationSession>;
  getStatus(id: string): Promise<VerificationSession>;
}
