import { NextResponse } from "next/server";
import { env } from "@/lib/env";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ ok: true, service: "vdb-partner-portal", supabaseConfigured: Boolean(env.NEXT_PUBLIC_SUPABASE_URL), mollieConfigured: Boolean(env.MOLLIE_API_KEY) }); }
