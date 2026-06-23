import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, authTokenFor } from "@/lib/auth-token";

export async function proxy(req: NextRequest) {
  const isProtected =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/pipeline") ||
    req.nextUrl.pathname.startsWith("/admin");
  if (!isProtected) return NextResponse.next();

  // Fail closed: an unset DEMO_PASSWORD means no valid token exists, so the
  // gate stays shut rather than falling back to a known default password.
  const password = process.env.DEMO_PASSWORD;
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (password && cookie) {
    try {
      if (cookie === (await authTokenFor(password))) return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }

  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/pipeline/:path*", "/admin/:path*"],
};
