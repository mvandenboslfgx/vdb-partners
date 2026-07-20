import { z } from "zod";
import { positiveEuroCents, uuid } from "@/lib/validation/common";

export const productSchema = z.object({
  sellerId: uuid,
  name: z.string().trim().min(2).max(180),
  sku: z.string().trim().min(1).max(80),
  description: z.string().trim().max(5000).optional(),
  salePrice: positiveEuroCents,
  costPrice: positiveEuroCents,
  vatRate: z.number().min(0).max(100),
  active: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productSchema>;
