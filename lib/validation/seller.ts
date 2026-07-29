import { z } from "zod";
import { iban, phone } from "@/lib/validation/common";
import { partnerApplicationIntakeSchema } from "@/lib/validation/partner-application";

const adultDate = z.coerce.date().refine((date) => {
  const today = new Date();
  const cutoff = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );
  return date <= cutoff;
}, "Seller must be at least 18 years old");

/**
 * @deprecated Local-legacy one-shot schema. Prefer `partnerApplicationIntakeSchema`
 * for Owner RC5 typed intake. Company/KvK are no longer unconditionally required.
 */
export const sellerOnboardingSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    dateOfBirth: adultDate,
    phone,
    partnerType: z.enum(["INDIVIDUAL", "BUSINESS"]),
    companyName: z.string().trim().max(160).optional(),
    kvkNumber: z.string().trim().optional(),
    vatNumber: z.string().trim().min(4).max(32).optional(),
    iban,
    acceptAgreement: z.literal(true),
  })
  .superRefine((data, ctx) => {
    if (data.partnerType === "INDIVIDUAL") {
      if (data.kvkNumber && data.kvkNumber.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["kvkNumber"],
          message: "Particuliere partners mogen geen KvK-nummer opgeven.",
        });
      }
      return;
    }
    if (!data.companyName || data.companyName.trim().length < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["companyName"],
        message: "Bedrijfsnaam is verplicht voor zakelijke partners.",
      });
    }
    if (!data.kvkNumber || !/^\d{8}$/.test(data.kvkNumber.trim())) {
      ctx.addIssue({
        code: "custom",
        path: ["kvkNumber"],
        message: "KvK-nummer moet exact 8 cijfers zijn.",
      });
    }
  });

export type SellerOnboarding = z.infer<typeof sellerOnboardingSchema>;

export const isAdult = (date: Date, now = new Date()) =>
  date <= new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());

/** Re-export Owner RC5 intake for callers migrating off sellerOnboardingSchema. */
export { partnerApplicationIntakeSchema };
