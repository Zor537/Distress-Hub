/**
 * GET /api/properties/[id]/insights
 *
 * Returns the Claude-generated narrative + risks + counter-thesis + change-
 * my-mind for a property, without rendering a PDF. Used by the deal detail
 * page client component to populate the on-page insights block.
 *
 * Backed by lib/insights.getInsightsFor() which caches by property id for
 * 30 minutes — the PDF endpoint shares the same cache.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  computeFinancialModel,
  defaultAssumptionsFor,
} from "@/lib/financial-model";
import { computeScenarios } from "@/lib/scenarios";
import { computeLocality } from "@/lib/locality";
import { getDiligenceChecklist } from "@/lib/diligence";
import { parseJsonField } from "@/lib/utils";
import { getInsightsFor } from "@/lib/insights";
import type { Signals, SignalExplanations } from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

type SignalsPayload = { signals: Signals; explanations: SignalExplanations };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signalsPayload = parseJsonField<SignalsPayload | null>(property.scoreSignals, null);

  const financial = computeFinancialModel(
    defaultAssumptionsFor({
      reservePrice: property.reservePrice,
      estimatedFmv: property.estimatedFmv,
    })
  );
  const scenarios = computeScenarios({
    reservePrice: property.reservePrice,
    estimatedFmv: property.estimatedFmv,
  });
  const locality = computeLocality(property.latitude, property.longitude, property.city);
  const diligence = getDiligenceChecklist(property.propertyType);

  const insights = await getInsightsFor({
    property,
    financial,
    scenarios,
    locality,
    diligence,
    signals: signalsPayload?.signals ?? null,
    explanations: signalsPayload?.explanations ?? null,
  });

  return NextResponse.json(insights, {
    headers: { "cache-control": "private, max-age=600" },
  });
}
