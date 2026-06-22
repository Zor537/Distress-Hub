import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const isProtected =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/pipeline") ||
    req.nextUrl.pathname.startsWith("/admin");
  if (!isProtected) return NextResponse.next();

  const auth = req.cookies.get("dh-auth")?.value;
  const expected = process.env.DEMO_PASSWORD ?? "distress2026";
  if (auth === expected) return NextResponse.next();

  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/pipeline/:path*", "/admin/:path*"],
};
