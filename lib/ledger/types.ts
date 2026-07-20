export type LedgerAccount = "cash" | "bank" | "accounts_receivable" | "revenue" | "vat_payable" | "cost_of_goods" | "commission_payable" | "payouts_payable" | "seller_payable";
export interface LedgerEntry { id: string; account: LedgerAccount; debit: number; credit: number; currency: string; occurredAt: Date; idempotencyKey: string; referenceType: string; referenceId: string; }
export interface JournalLine { account: LedgerAccount; debit?: number; credit?: number; }
