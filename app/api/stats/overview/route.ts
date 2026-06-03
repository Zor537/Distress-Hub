import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [total, scored, shortlisted, agg] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { dhScore: { not: null } } }),
    prisma.property.count({ where: { pipelineStage: { in: ["SHORTLISTED", "DILIGENCE", "BID_PLACED"] } } }),
    prisma.property.aggregate({
      _avg: { dhScore: true, discountPct: true, reservePrice: true },
      _sum: { reservePrice: true, estimatedFmv: true },
    }),
  ]);

  const totalReserve = agg._sum.reservePrice ?? 0;
  const totalFmv = agg._sum.estimatedFmv ?? 0;
  const aggDiscount = totalFmv ? ((totalFmv - totalReserve) / totalFmv) * 100 : null;

  return NextResponse.json({
    deals: {
      tracked: total,
      scored,
      shortlisted,
    },
    averages: {
      dhScore: agg._avg.dhScore ?? null,
      discountPct: aggDiscount,
      reservePrice: agg._avg.reservePrice ?? null,
    },
    totals: {
      reserveValue: totalReserve,
      fmvValue: totalFmv,
    },
  });
}
