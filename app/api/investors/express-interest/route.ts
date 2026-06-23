import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { INVESTOR_TYPES } from "@/lib/constants";
import { notifyNewInterest } from "@/lib/notify";

const BodySchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  type: z.enum(INVESTOR_TYPES),
  ticketSize: z.number().positive().max(1e11).optional(),
  message: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Confirm property exists (title/city/state used in the lead notification)
  const property = await prisma.property.findUnique({
    where: { id: data.propertyId },
    select: { id: true, title: true, city: true, state: true },
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // Upsert investor
  const investor = await prisma.investor.upsert({
    where: { email: data.email },
    update: {
      name: data.name,
      phone: data.phone ?? null,
      type: data.type,
      ticketSize: data.ticketSize ?? null,
    },
    create: {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      type: data.type,
      ticketSize: data.ticketSize ?? null,
    },
  });

  const interest = await prisma.investorInterest.create({
    data: {
      propertyId: data.propertyId,
      investorId: investor.id,
      message: data.message ?? null,
    },
  });

  // Fire the lead alert. Env-gated and never-throwing (see lib/notify.ts) —
  // awaited so the serverless instance stays alive long enough to deliver,
  // but a failure here can't affect the persisted lead or this response.
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host");
  await notifyNewInterest({
    investor: {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      type: data.type,
      ticketSize: data.ticketSize ?? null,
    },
    property,
    message: data.message ?? null,
    dealUrl: host ? `${proto}://${host}/deals/${property.id}` : null,
  });

  return NextResponse.json({ ok: true, interestId: interest.id });
}
