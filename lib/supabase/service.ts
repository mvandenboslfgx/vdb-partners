import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/**
 * Privileged database access for server-side workflows and Node integration tests.
 * Keep calls to this factory behind an authorization boundary in application code.
 */
export function createAdminClient() {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase admin client is not configured");
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
