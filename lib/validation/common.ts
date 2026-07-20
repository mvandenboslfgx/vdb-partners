import { z } from "zod";

export const euroCents = z.number().int().nonnegative();
export const positiveEuroCents = z.number().int().positive();
export const uuid = z.string().uuid();
export const iban = z.string().trim().toUpperCase().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/, "Invalid IBAN");
export const phone = z.string().trim().min(6).max(32);
export function maskIban(ibanValue: string) {
  const normalized = ibanValue.replace(/\s/g, "");
  return normalized.length < 8 ? "****" : `${normalized.slice(0, 4)}${"•".repeat(Math.max(0, normalized.length - 8))}${normalized.slice(-4)}`;
}
