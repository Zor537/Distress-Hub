import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeDHScore } from "@/lib/scoring";

/**
 * Mock BAANKNET ingest trigger.
 *
 * For the demo build we are not running the live Python scraper. Hitting this
 * endpoint re-scores every property in the DB using the current heuristic
 * weights — useful when scoring logic changes mid-iteration. The real Python
 * scraper would POST normalised listings here in v1.
 */
export async function POST(req: Request) {
  if (process.env.DEMO_PASSWORD) {
    const auth = req.headers.get("x-dh-auth");
    if (auth && auth !== process.env.DEMO_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const props = await prisma.property.findMany();
  let rescored = 0;
  for (const p of props) {
    const dh = computeDHScore({
      city: p.city,
      bank: p.bank,
      propertyType: p.propertyType,
      reservePrice: p.reservePrice,
      builtUpArea: p.builtUpArea,
      possessionType: p.possessionType,
    });
    await prisma.property.update({
      where: { id: p.id },
      data: {
        dhScore: dh.score,
        estimatedFmv: dh.estimatedFmv,
        discountPct: dh.discountPct,
        scoreSignals: JSON.stringify({
          signals: dh.signals,
          explanations: dh.explanations,
        }),
      },
    });
    rescored++;
  }
  return NextResponse.json({ ok: true, rescored, source: "BAANKNET (mock)" });
}
