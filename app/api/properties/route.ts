import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const QuerySchema = z.object({
  city: z.string().optional(),
  type: z.string().optional(),
  bank: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  possessionType: z.string().optional(),
  pipelineStage: z.string().optional(),
  sort: z.enum(["score", "discount", "price-asc", "price-desc", "auction"]).default("score"),
  limit: z.coerce.number().int().positive().max(200).default(60),
});

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const q = parsed.data;

  const where: Record<string, unknown> = {};
  if (q.city) where.city = q.city;
  if (q.type) where.propertyType = q.type;
  if (q.bank) where.bank = q.bank;
  if (q.minScore !== undefined) where.dhScore = { gte: q.minScore };
  if (q.maxPrice !== undefined) where.reservePrice = { lte: q.maxPrice };
  if (q.possessionType) where.possessionType = q.possessionType;
  if (q.pipelineStage) where.pipelineStage = q.pipelineStage;

  const orderBy: Record<string, "asc" | "desc"> =
    q.sort === "discount"
      ? { discountPct: "desc" }
      : q.sort === "price-asc"
        ? { reservePrice: "asc" }
        : q.sort === "price-desc"
          ? { reservePrice: "desc" }
          : q.sort === "auction"
            ? { auctionDate: "asc" }
            : { dhScore: "desc" };

  const rows = await prisma.property.findMany({
    where,
    orderBy,
    take: q.limit,
  });

  return NextResponse.json({
    count: rows.length,
    properties: rows,
  });
}
