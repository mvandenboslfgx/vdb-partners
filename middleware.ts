import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const protectedPath = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin");
  if (!protectedPath) return response;
  const hasSession = request.cookies.getAll().some((cookie) => cookie.name.includes("auth-token"));
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}
export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
