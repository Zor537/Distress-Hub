import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, authTokenFor, gatePassword } from "@/lib/auth-token";

const BodySchema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  // Open demo: defaults to the published demo password when DEMO_PASSWORD is unset.
  const expected = gatePassword();
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
