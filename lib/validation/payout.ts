import { z } from "zod";
import { iban, positiveEuroCents, uuid } from "@/lib/validation/common";

export const bankPayoutSchema = z.object({ sellerId: uuid, amount: positiveEuroCents, iban, accountHolder: z.string().trim().min(1).max(160) });
export const cashPayoutSchema = z.object({ sellerId: uuid, amount: positiveEuroCents, recipientName: z.string().trim().min(1).max(160) });
export type BankPayoutInput = z.infer<typeof bankPayoutSchema>;
export type CashPayoutInput = z.infer<typeof cashPayoutSchema>;
