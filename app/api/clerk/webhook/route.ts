/**
 * Clerk webhook — keeps our User table in sync with Clerk's source of truth.
 *
 * Configure in the Clerk Dashboard:
 *   Webhooks → Add endpoint
 *     URL: https://distresshub-zor1.vercel.app/api/clerk/webhook
 *     Events: user.created, user.updated, user.deleted
 *   Copy the signing secret → set as CLERK_WEBHOOK_SECRET in Vercel env.
 *
 * Svix signature verification keeps the endpoint safe even though it's public.
 */
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";

type ClerkEmail = { email_address: string; id: string };
type ClerkPhone = { phone_number: string; id: string };

type ClerkUserData = {
  id: string;
  email_addresses?: ClerkEmail[];
  primary_email_address_id?: string | null;
  phone_numbers?: ClerkPhone[];
  primary_phone_number_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};

type WebhookEvent = {
  type: "user.created" | "user.updated" | "user.deleted" | string;
  data: ClerkUserData;
};

function primaryEmail(u: ClerkUserData): string | null {
  const list = u.email_addresses ?? [];
  if (list.length === 0) return null;
  if (u.primary_email_address_id) {
    const match = list.find((e) => e.id === u.primary_email_address_id);
    if (match) return match.email_address;
  }
  return list[0].email_address;
}

function primaryPhone(u: ClerkUserData): string | null {
  const list = u.phone_numbers ?? [];
  if (list.length === 0) return null;
  if (u.primary_phone_number_id) {
    const match = list.find((p) => p.id === u.primary_phone_number_id);
    if (match) return match.phone_number;
  }
  return list[0].phone_number;
}

function fullName(u: ClerkUserData): string | null {
  const parts = [u.first_name, u.last_name].filter(Boolean) as string[];
  return parts.length ? parts.join(" ") : null;
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Svix signature headers
  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const rawBody = await req.text();
  const wh = new Webhook(secret);
  let evt: WebhookEvent;
  try {
    evt = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid signature", detail: err instanceof Error ? err.message : String(err) },
      { status: 401 }
    );
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const u = evt.data;
    const email = primaryEmail(u);
    if (!email) {
      return NextResponse.json({ ok: false, reason: "no email on user" });
    }

    await prisma.user.upsert({
      where: { clerkId: u.id },
      update: {
        email,
        name: fullName(u),
        phone: primaryPhone(u),
        imageUrl: u.image_url ?? null,
      },
      create: {
        clerkId: u.id,
        email,
        name: fullName(u),
        phone: primaryPhone(u),
        imageUrl: u.image_url ?? null,
      },
    });

    return NextResponse.json({ ok: true, action: evt.type, clerkId: u.id });
  }

  if (evt.type === "user.deleted") {
    await prisma.user.deleteMany({ where: { clerkId: evt.data.id } });
    return NextResponse.json({ ok: true, action: "deleted", clerkId: evt.data.id });
  }

  return NextResponse.json({ ok: true, action: "ignored", type: evt.type });
}
