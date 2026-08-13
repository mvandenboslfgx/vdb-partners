import { z } from "zod";
import {
  dutchKvkSchema,
  partnerTypeSchema,
  type PartnerType,
} from "@/lib/validation/partner-type";
const optionalTrimmed = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

/**
 * Owner RC5 `submit_partner_application` intake schema.
 * Type must be explicit. Company/KvK rules are type-conditional.
 * Hidden BUSINESS fields must not be submitted for INDIVIDUAL.
 */
export const partnerApplicationIntakeSchema = z
  .object({
    partnerType: partnerTypeSchema,
    legalName: z.string().trim().min(1, "Naam is verplicht").max(200),
    tradeName: optionalTrimmed,
    contactEmail: z.string().trim().email().max(320),
    companyName: optionalTrimmed,
    kvkNumber: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    vatNumber: optionalTrimmed,
    phone: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    /** UI-only; never sent as Owner partner_type. */
    businessSubtype: z.enum(["sole_trader", "company"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.partnerType === "INDIVIDUAL") {
      if (data.kvkNumber) {
        ctx.addIssue({
          code: "custom",
          path: ["kvkNumber"],
          message:
            "Particuliere partners mogen geen KvK-nummer opgeven. Kies Zakelijk als u een onderneming bent.",
        });
      }
      return;
    }

    // BUSINESS — company/trade name is required separately from representative legalName.
    const company = data.companyName ?? data.tradeName ?? "";
    if (!company.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["companyName"],
        message: "Bedrijfsnaam is verplicht voor zakelijke partners.",
      });
    }

    if (!data.kvkNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["kvkNumber"],
        message: "KvK-nummer is verplicht voor zakelijke partners.",
      });
    } else {
      const kvk = dutchKvkSchema.safeParse(data.kvkNumber);
      if (!kvk.success) {
        ctx.addIssue({
          code: "custom",
          path: ["kvkNumber"],
          message: "KvK-nummer moet exact 8 cijfers zijn.",
        });
      }
    }
  });

export type PartnerApplicationIntake = z.infer<
  typeof partnerApplicationIntakeSchema
>;

/**
 * Strip type-incompatible fields before RPC so stale hidden inputs
 * cannot convert INDIVIDUAL → BUSINESS identity on the server.
 */
export function sanitizePartnerApplicationForSubmit(
  input: PartnerApplicationIntake,
): {
  partnerType: PartnerType;
  legalName: string;
  tradeName: string | null;
  contactEmail: string;
  kvk: string | null;
  vat: string | null;
  phone: string | null;
} {
  if (input.partnerType === "INDIVIDUAL") {
    return {
      partnerType: "INDIVIDUAL",
      legalName: input.legalName,
      tradeName: input.tradeName ?? input.legalName,
      contactEmail: input.contactEmail,
      kvk: null,
      vat: null,
      phone: input.phone ?? null,
    };
  }

  const companyName = input.companyName ?? input.tradeName ?? input.legalName;
  return {
    partnerType: "BUSINESS",
    legalName: input.legalName,
    tradeName: companyName,
    contactEmail: input.contactEmail,
    kvk: input.kvkNumber!.trim(),
    vat: input.vatNumber ?? null,
    phone: input.phone ?? null,
  };
}
