import { z } from "zod";
import { iban, phone } from "@/lib/validation/common";

const adultDate = z.coerce.date().refine((date) => {
  const today = new Date();
  const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return date <= cutoff;
}, "Seller must be at least 18 years old");

export const sellerOnboardingSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: adultDate,
  phone,
  companyName: z.string().trim().min(1).max(160),
  kvkNumber: z.string().trim().regex(/^\d{8}$/, "Invalid KvK number"),
  vatNumber: z.string().trim().min(4).max(32).optional(),
  iban,
  acceptAgreement: z.literal(true),
});
export type SellerOnboarding = z.infer<typeof sellerOnboardingSchema>;
export const isAdult = (date: Date, now = new Date()) => date <= new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
