export type SharedRole =
  "customer" | "partner_pending" | "partner" | "staff" | "admin" | "owner";

export interface ProfileRow {
  id: string;
  role: SharedRole;
  seller_approved: boolean;
  created_at: string;
  updated_at: string;
}
