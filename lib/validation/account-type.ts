import { z } from "zod";

export const sellerAccountTypes = ["particular", "sole_trader", "company"] as const;
export const sellerAccountTypeSchema = z.enum(sellerAccountTypes);
export type SellerAccountType = z.infer<typeof sellerAccountTypeSchema>;
