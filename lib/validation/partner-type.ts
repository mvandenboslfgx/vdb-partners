import { z } from "zod";
import {
  sellerAccountTypeSchema,
  type SellerAccountType,
} from "@/lib/validation/account-type";

/** Owner RC5 canonical partner types — never inferred from KvK/company fields. */
export const partnerTypes = ["INDIVIDUAL", "BUSINESS"] as const;
export const partnerTypeSchema = z.enum(partnerTypes);
export type PartnerType = z.infer<typeof partnerTypeSchema>;

/** Dutch UI labels for the two top-level Owner types. */
export const partnerTypeLabels: Record<PartnerType, string> = {
  INDIVIDUAL: "Particulier",
  BUSINESS: "Zakelijk",
};

/**
 * Optional business subtype for UI only. Both map to Owner `BUSINESS`.
 * Never sent as a third top-level partner type.
 */
export const businessSubtypes = ["sole_trader", "company"] as const;
export const businessSubtypeSchema = z.enum(businessSubtypes);
export type BusinessSubtype = z.infer<typeof businessSubtypeSchema>;

export const businessSubtypeLabels: Record<BusinessSubtype, string> = {
  sole_trader: "ZZP / eenmanszaak",
  company: "Bedrijf (BV, VOF, …)",
};

/** Legacy local account types → Owner RC5 partner type. */
export function mapLegacyAccountTypeToPartnerType(
  accountType: SellerAccountType,
): PartnerType {
  switch (accountType) {
    case "particular":
      return "INDIVIDUAL";
    case "sole_trader":
    case "company":
      return "BUSINESS";
    default: {
      const _exhaustive: never = accountType;
      return _exhaustive;
    }
  }
}

/**
 * Map a UI choice (legacy or canonical) to Owner partner type.
 * Rejects unknown values — never infers from company/KvK fields.
 */
export function resolvePartnerTypeFromChoice(
  choice: string | null | undefined,
): PartnerType | null {
  if (!choice) return null;
  const normalized = choice.trim();
  const upper = normalized.toUpperCase();
  if (upper === "INDIVIDUAL" || upper === "BUSINESS") {
    return upper;
  }
  const legacy = sellerAccountTypeSchema.safeParse(normalized.toLowerCase());
  if (!legacy.success) return null;
  return mapLegacyAccountTypeToPartnerType(legacy.data);
}

/** Owner format-only KvK rule: exactly 8 digits after trim. */
export function isValidDutchKvk(value: string | null | undefined): boolean {
  if (value == null) return false;
  return /^\d{8}$/.test(value.trim());
}

export const dutchKvkSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "KvK-nummer moet exact 8 cijfers zijn");
