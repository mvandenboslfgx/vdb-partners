import { randomBytes } from "crypto";
import { env } from "@/lib/env";
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateSellerCode() {
  const bytes = randomBytes(6);
  return `VDB-${[...bytes].map((byte) => alphabet[byte % alphabet.length]).join("")}`;
}
export function referralLink(code: string) {
  if (!/^VDB-[A-Z0-9]{6}$/.test(code)) throw new Error("Invalid seller referral code");
  return `${env.MAIN_SITE_URL.replace(/\/$/, "")}/bestellen?partner=${encodeURIComponent(code)}`;
}
