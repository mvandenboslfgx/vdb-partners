export interface ProfileRow { id: string; role: "owner" | "finance_admin" | "sales_admin" | "support_admin" | "seller"; seller_approved: boolean; created_at: string; updated_at: string; }
export interface AuditLogRow { id: string; actor_id: string; actor_role: ProfileRow["role"]; action: string; entity_type: string; entity_id: string; before: unknown | null; after: unknown | null; reason: string | null; correlation_id: string | null; created_at: string; }
export interface PaymentRow { id: string; order_id: string; provider: "mollie" | "manual"; provider_payment_id: string | null; status: string; amount: number; verified_at: string | null; }
export interface PaymentWebhookEventRow { id: string; provider: string; provider_event_id: string; payment_id: string; created_at: string; }
export interface CommissionRow { id: string; order_id: string; seller_id: string; amount: number; status: "calculated" | "available" | "reserved" | "paid" | "needs_manual_review"; available_at: string | null; }
export interface PayoutBatchRow { id: string; seller_id: string; method: "bank" | "cash"; amount: number; status: string; created_at: string; }
export interface LedgerEntryRow { id: string; account: string; debit: number; credit: number; currency: string; idempotency_key: string; reference_type: string; reference_id: string; occurred_at: string; }
export interface NotificationRow { id: string; profile_id: string; title: string; body: string; href: string | null; read_at: string | null; created_at: string; }

/** Key application rows; replace with Supabase generated types after the SQL schema is finalized. */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow };
      audit_logs: { Row: AuditLogRow };
      payments: { Row: PaymentRow };
      payment_webhook_events: { Row: PaymentWebhookEventRow };
      commissions: { Row: CommissionRow };
      payout_batches: { Row: PayoutBatchRow };
      ledger_entries: { Row: LedgerEntryRow };
      notifications: { Row: NotificationRow };
    };
  };
}
