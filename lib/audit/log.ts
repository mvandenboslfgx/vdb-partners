import { createAdminClient } from "@/lib/supabase/admin";
import { maskSensitive } from "@/lib/security/masking";
import type { Role } from "@/lib/auth/roles";

export interface AuditInput { actor: string; role: Role; action: string; entityType: string; entityId: string; before?: unknown; after?: unknown; reason?: string; correlationId?: string; }
export async function appendAuditLog(input: AuditInput) {
  const { data, error } = await createAdminClient().from("audit_logs").insert({
    actor_id: input.actor, actor_role: input.role, action: input.action, entity_type: input.entityType, entity_id: input.entityId,
    before: input.before ? maskSensitive(input.before) : null, after: input.after ? maskSensitive(input.after) : null,
    reason: input.reason ?? null, correlation_id: input.correlationId ?? null,
  }).select().single();
  if (error) throw error;
  return data;
}
