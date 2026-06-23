/**
 * GET /api/properties/[id]/memo  →  2-page PDF investor memo.
 *
 * Pipeline:
 *   1. Load property + parse score signals.
 *   2. Compute base financial model + Bull/Base/Bear scenarios + sensitivity grid.
 *   3. Compute locality + diligence checklist.
 *   4. Fetch insights (narrative + risks + counter-thesis + change-my-mind)
 *      via lib/insights.getInsightsFor() — shared with /api/properties/[id]/insights
 *      and cached for 30 min per property.
 *   5. Server-render <MemoDocument /> via @react-pdf/renderer.
 *   6. Stream PDF bytes back as application/pdf.
 */
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import {
  computeFinancialModel,
  computeSensitivityGrid,
  defaultAssumptionsFor,
} from "@/lib/financial-model";
import { computeScenarios } from "@/lib/scenarios";
import { computeLocality } from "@/lib/locality";
import { getDiligenceChecklist } from "@/lib/diligence";
import { parseJsonField } from "@/lib/utils";
import { getInsightsFor } from "@/lib/insights";
import type { Signals, SignalExplanations } from "@/lib/scoring";
import { MemoDocument, type MemoData } from "@/lib/memo-pdf";

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
  const imageUrls = parseJsonField<string[]>(property.imageUrls, []);
  const heroImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

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
  const sensitivity = computeSensitivityGrid({
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

  const memoData: MemoData = {
    property: {
      id: property.id,
      title: property.title,
      address: property.address,
      city: property.city,
      state: property.state,
      bank: property.bank,
      propertyType: property.propertyType,
      reservePrice: property.reservePrice,
      estimatedFmv: property.estimatedFmv,
      discountPct: property.discountPct,
      builtUpArea: property.builtUpArea,
      bedrooms: property.bedrooms,
      auctionDate: property.auctionDate,
      possessionType: property.possessionType,
      sourceUrl: property.sourceUrl,
      dhScore: property.dhScore,
      source: property.source,
      heroImageUrl,
    },
    signals: signalsPayload?.signals ?? null,
    explanations: signalsPayload?.explanations ?? null,
    financial,
    scenarios,
    sensitivity,
    locality,
    diligence,
    narrative: insights.narrative,
    risks: insights.risks,
    counterThesis: insights.counterThesis,
    changeMyMind: insights.changeMyMind,
  };

  const buffer = await renderToBuffer(MemoDocument({ data: memoData }));

  const filename = `DH_Memo_${property.id.slice(0, 8)}_${property.city.replace(/\s+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, max-age=300",
    },
  });
}
