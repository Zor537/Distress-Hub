import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { INVESTOR_TYPES } from "@/lib/constants";

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

  // Confirm property exists
  const property = await prisma.property.findUnique({
    where: { id: data.propertyId },
    select: { id: true },
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

  return NextResponse.json({ ok: true, interestId: interest.id });
}
