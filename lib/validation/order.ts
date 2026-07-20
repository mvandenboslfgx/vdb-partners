import { z } from "zod";
import { uuid } from "@/lib/validation/common";

export const orderLineSchema = z.object({ productId: uuid, quantity: z.number().int().positive().max(999) });
export const orderSchema = z.object({
  sellerId: uuid, customerName: z.string().trim().min(1).max(160), customerEmail: z.string().email(),
  lines: z.array(orderLineSchema).min(1), paymentMethod: z.enum(["mollie", "bank_transfer"]),
  deliveryAddress: z.object({ line1: z.string().min(1), postalCode: z.string().min(3), city: z.string().min(1), country: z.string().length(2) }),
});
export type OrderInput = z.infer<typeof orderSchema>;
