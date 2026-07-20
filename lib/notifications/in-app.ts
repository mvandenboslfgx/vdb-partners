import { createAdminClient } from "@/lib/supabase/admin";
export interface InAppNotification { profileId: string; title: string; body: string; href?: string; }
export async function createInAppNotification(input: InAppNotification) {
  const { data, error } = await createAdminClient().from("notifications").insert({ profile_id: input.profileId, title: input.title, body: input.body, href: input.href ?? null }).select().single();
  if (error) throw error;
  return data;
}
