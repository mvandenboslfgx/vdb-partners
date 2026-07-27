import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { assertNotProductionSupabaseUrl } from "@/lib/contract/env";

export async function middleware(request: NextRequest) {
  assertNotProductionSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const response = await updateSession(request);
  const path = request.nextUrl.pathname;
  const protectedPath =
    path.startsWith("/dashboard") ||
    path.startsWith("/admin") ||
    path.startsWith("/onboarding");
  if (!protectedPath) return response;
  const hasSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("auth-token"));
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding"],
};
