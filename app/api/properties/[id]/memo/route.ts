/**
 * GET /api/properties/[id]/memo  →  1-page PDF investor memo.
 *
 * Pipeline:
 *   1. Load property + parse score signals.
 *   2. Compute financial model with default assumptions.
 *   3. Call Claude (claude-haiku-4-5) for a 3-paragraph investment narrative.
 *      Falls back to a heuristic narrative if ANTHROPIC_API_KEY is missing
 *      or the call fails — the PDF still renders.
 *   4. Server-render <MemoDocument /> via @react-pdf/renderer.
 *   5. Stream the PDF bytes back as application/pdf.
 */
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { computeFinancialModel, defaultAssumptionsFor } from "@/lib/financial-model";
import { parseJsonField } from "@/lib/utils";
import type { Signals, SignalExplanations } from "@/lib/scoring";
import { MemoDocument, type MemoData } from "@/lib/memo-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

type SignalsPayload = { signals: Signals; explanations: SignalExplanations };

const MODEL = "claude-haiku-4-5-20251001";

function fallbackNarrative(data: Omit<MemoData, "narrative">): string[] {
  const { property: p, financial } = data;
  const discount = p.discountPct ? `${p.discountPct.toFixed(1)}%` : "an unconfirmed";
  const irr = financial.irr.toFixed(1);

  return [
    `${p.title} is a ${p.propertyType.toLowerCase()} asset in ${p.city}, ${p.state} being auctioned by ${p.bank} under SARFAESI proceedings. The reserve price sits ${discount} below estimated fair market value, putting the asset in DistressHub's discount-driven opportunity band.`,
    `The DH Score of ${p.dhScore ?? "TBD"} reflects a weighted blend of discount magnitude, title health, possession state, micro-market liquidity, and renovation lift. With base-case assumptions and a ${financial.inputs.holdMonths}-month hold, the model projects an IRR of ${irr}% and an MOIC of ${financial.moic.toFixed(2)}x.`,
    `Before bidding, prioritise an encumbrance certificate review and physical site inspection. EMD payment timelines move quickly post-listing — coordinate with our acquisitions desk if you need same-day diligence support.`,
  ];
}

async function callClaude(data: Omit<MemoData, "narrative">): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackNarrative(data);
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { property: p, financial, signals, explanations } = data;

    const prompt = `Write a sharp 3-paragraph investment narrative (~80 words each, ~240 words total) for this distressed property auction memo.

Property:
- ${p.title}
- ${p.address}, ${p.city}, ${p.state}
- Property type: ${p.propertyType}
- Selling bank: ${p.bank} (under SARFAESI)
- Reserve price: Rs ${p.reservePrice.toLocaleString("en-IN")}
- Estimated FMV: Rs ${(p.estimatedFmv ?? 0).toLocaleString("en-IN")}
- Discount: ${p.discountPct?.toFixed(1) ?? "TBD"}%
- DH Score: ${p.dhScore ?? "TBD"}/100
- Auction date: ${p.auctionDate ?? "TBD"}
- Possession: ${p.possessionType ?? "Unknown"}
- Built-up area: ${p.builtUpArea ?? "Not disclosed"}
${signals && explanations
  ? `Score signals:
${Object.entries(signals).map(([k, v]) => `- ${k}: ${v}/100 — ${explanations[k as keyof SignalExplanations]}`).join("\n")}`
  : ""}

Financial model (base case, ${financial.inputs.holdMonths}-month hold):
- Total investment: Rs ${financial.totalInvestment.toLocaleString("en-IN")}
- Projected exit value: Rs ${financial.exitValue.toLocaleString("en-IN")}
- Projected IRR: ${financial.irr.toFixed(1)}%
- MOIC: ${financial.moic.toFixed(2)}x

Structure:
- Para 1: The opportunity — what's being sold, why it's distressed, headline discount.
- Para 2: The thesis — why the DH Score and unit economics support a bid, key risks to acknowledge.
- Para 3: Action — what the investor should diligence first and the next operational step.

Write in declarative, professional investor-memo prose. No headers, no bullet points, no markdown. Return ONLY the three paragraphs separated by a single blank line.`;

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    // Concat all text blocks
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n")
      .trim();

    const paragraphs = text
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (paragraphs.length < 2) {
      console.warn("[memo] Claude returned <2 paragraphs, falling back");
      return fallbackNarrative(data);
    }
    return paragraphs.slice(0, 3);
  } catch (err) {
    console.warn("[memo] Claude call failed, using fallback:", err);
    return fallbackNarrative(data);
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signalsPayload = parseJsonField<SignalsPayload | null>(property.scoreSignals, null);

  const assumptions = defaultAssumptionsFor({
    reservePrice: property.reservePrice,
    estimatedFmv: property.estimatedFmv,
  });
  const financial = computeFinancialModel(assumptions);

  const baseData = {
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
    },
    signals: signalsPayload?.signals ?? null,
    explanations: signalsPayload?.explanations ?? null,
    financial,
  };

  const narrative = await callClaude(baseData);

  const memoData: MemoData = { ...baseData, narrative };
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
