import { createClient } from "@/lib/supabase/server";
import {
  RC3_FAIL_CLOSED_FLAGS,
  type Rc3FailClosedFlag,
  rc3FlagDefault,
} from "@/lib/contract/pin";
import { assertOwnerContractTable } from "@/lib/contract/surfaces";

export type FailClosedFlagState = Record<Rc3FailClosedFlag, boolean>;

export async function loadFailClosedFlags(): Promise<FailClosedFlagState> {
  const defaults = Object.fromEntries(
    RC3_FAIL_CLOSED_FLAGS.map((flag) => [flag, rc3FlagDefault(flag)]),
  ) as FailClosedFlagState;

  assertOwnerContractTable("feature_flags");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("key, enabled")
    .in("key", [...RC3_FAIL_CLOSED_FLAGS]);
  if (error) return defaults;
  for (const row of data ?? []) {
    if (RC3_FAIL_CLOSED_FLAGS.includes(row.key as Rc3FailClosedFlag)) {
      defaults[row.key as Rc3FailClosedFlag] = row.enabled === true;
    }
  }
  return defaults;
}

export function assertBookingAllowed(flags: FailClosedFlagState): void {
  if (!flags.appointments_booking) {
    throw new Error("CONTRACT_SURFACE_UNAVAILABLE:appointments_booking");
  }
}
