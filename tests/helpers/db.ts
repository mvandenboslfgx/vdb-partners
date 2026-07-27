import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", override: true });

/** Local Docker `user_roles` proposal roles — not Owner RC2 shared roles. */
export type LocalLegacyRole = "owner" | "finance_admin" | "sales_admin" | "support_admin" | "seller";

export function createTestAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Local Supabase service credentials are required");
  return createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function createAuthUser(input: { email?: string; password?: string; role: LocalLegacyRole }) {
  const db = createTestAdminClient();
  const { data, error } = await db.auth.admin.createUser({
    email: input.email ?? `business-flow-${randomUUID()}@example.test`,
    password: input.password ?? "Integration-test-password-1!",
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("Auth user was not created");

  const { error: roleError } = await db.from("user_roles").insert({
    user_id: data.user.id,
    role: input.role,
  });
  if (roleError) throw roleError;
  return data.user;
}
