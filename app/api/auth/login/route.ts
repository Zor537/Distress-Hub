import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, authTokenFor } from "@/lib/auth-token";

const BodySchema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  // Fail closed: no fallback to a hardcoded default password.
  const expected = process.env.DEMO_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }
  if (parsed.data.password !== expected) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await authTokenFor(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
