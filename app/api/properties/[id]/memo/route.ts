/**
 * GET /api/properties/[id]/memo  →  2-page PDF investor memo.
 *
 * Pipeline:
 *   1. Load property + parse score signals.
 *   2. Compute base financial model + Bull/Base/Bear scenarios + sensitivity grid.
 *   3. Compute locality (airport / CBD / IT hub distance) from lat/lng.
 *   4. Build deal-type-specific diligence checklist.
 *   5. Call Claude (claude-haiku-4-5) for JSON-output {narrative, risks}.
 *      Falls back to heuristic if ANTHROPIC_API_KEY missing or call fails.
 *   6. Server-render <MemoDocument /> via @react-pdf/renderer.
 *   7. Stream PDF bytes back as application/pdf.
 */
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
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
import type { Signals, SignalExplanations } from "@/lib/scoring";
import { MemoDocument, type MemoData, type Risk } from "@/lib/memo-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

type SignalsPayload = { signals: Signals; explanations: SignalExplanations };

const MODEL = "claude-haiku-4-5-20251001";

type ClaudeOutput = {
  narrative: string[];
  risks: Risk[];
};

function fallbackOutput(data: Omit<MemoData, "narrative" | "risks">): ClaudeOutput {
  const { property: p, financial } = data;
  const discount = p.discountPct ? `${p.discountPct.toFixed(1)}%` : "an unconfirmed";
  const irr = financial.irr.toFixed(1);

  return {
    narrative: [
      `${p.title} is a ${p.propertyType.toLowerCase()} asset in ${p.city}, ${p.state} being auctioned by ${p.bank} under SARFAESI proceedings. The reserve price sits ${discount} below estimated fair market value, putting the asset in DistressHub's discount-driven opportunity band.`,
      `The DH Score of ${p.dhScore ?? "TBD"} reflects a weighted blend of discount magnitude, title health, possession state, micro-market liquidity, and renovation lift. With base-case assumptions and an ${financial.inputs.holdMonths}-month hold, the model projects an IRR of ${irr}% and an MOIC of ${financial.moic.toFixed(2)}x.`,
      `Before bidding, prioritise an encumbrance certificate review and physical site inspection. EMD payment timelines move quickly post-listing — coordinate with our acquisitions desk if you need same-day diligence support.`,
    ],
    risks: [
      {
        title: "Title encumbrance",
        severity: "medium",
        detail: `${p.bank}'s sale extinguishes only the lender's claim. Pre-existing third-party liens, tax dues, or society charges survive — verify via a 30-year EC pull.`,
      },
      {
        title: "Possession transfer",
        severity: p.possessionType === "PHYSICAL" ? "low" : "high",
        detail:
          p.possessionType === "PHYSICAL"
            ? "Physical possession is held by the bank — handover is administrative post-bid."
            : "Bank holds only symbolic possession; physical eviction can take 6-12 months via DRT.",
      },
      {
        title: "Renovation cost overrun",
        severity: "medium",
        detail:
          "Deferred maintenance is common in distressed assets. Stress-test the model with renovation cost +50% before committing.",
      },
    ],
  };
}

async function callClaude(data: Omit<MemoData, "narrative" | "risks">): Promise<ClaudeOutput> {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackOutput(data);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { property: p, financial, signals, explanations, scenarios, locality, diligence } = data;

    const prompt = `You are writing the narrative + risk-register for a 2-page investor memo. Return ONLY valid JSON matching this exact schema (no markdown fences, no extra text):

{
  "narrative": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "risks": [
    {"title": "Short risk title (5-8 words)", "severity": "low" | "medium" | "high", "detail": "1-2 sentences explaining the risk and what would mitigate it"},
    {"title": "...", "severity": "...", "detail": "..."},
    {"title": "...", "severity": "...", "detail": "..."}
  ]
}

DEAL CONTEXT
${p.title} — ${p.address}, ${p.city}, ${p.state}
Property type: ${p.propertyType} | Selling bank: ${p.bank} (SARFAESI) | Source: ${p.source}
Reserve: Rs ${p.reservePrice.toLocaleString("en-IN")} | Estimated FMV: Rs ${(p.estimatedFmv ?? 0).toLocaleString("en-IN")} | Discount: ${p.discountPct?.toFixed(1) ?? "TBD"}%
DH Score: ${p.dhScore ?? "TBD"}/100 | Auction date: ${p.auctionDate ?? "TBD"} | Possession: ${p.possessionType ?? "Unknown"}
Built-up: ${p.builtUpArea ?? "Not disclosed"} sq ft
${signals && explanations
  ? `Score signals:
${Object.entries(signals).map(([k, v]) => `  - ${k}: ${v}/100 — ${explanations[k as keyof SignalExplanations]}`).join("\n")}`
  : ""}

FINANCIAL MODEL (base case)
  Total investment: Rs ${financial.totalInvestment.toLocaleString("en-IN")} | Exit value: Rs ${financial.exitValue.toLocaleString("en-IN")}
  Projected IRR: ${financial.irr.toFixed(1)}% | MOIC: ${financial.moic.toFixed(2)}x | Hold: ${financial.inputs.holdMonths} months
  ${financial.tax.capitalGainsType} @ ${financial.tax.capitalGainsRate}% → Net profit after tax: Rs ${financial.tax.netProfitAfterTax.toLocaleString("en-IN")}

SCENARIO BAND
  Bull: ${scenarios.bull.result.irr.toFixed(1)}% IRR, ${scenarios.bull.result.moic.toFixed(2)}x MOIC (${scenarios.bull.result.inputs.holdMonths}mo)
  Base: ${scenarios.base.result.irr.toFixed(1)}% IRR, ${scenarios.base.result.moic.toFixed(2)}x MOIC (${scenarios.base.result.inputs.holdMonths}mo)
  Bear: ${scenarios.bear.result.irr.toFixed(1)}% IRR, ${scenarios.bear.result.moic.toFixed(2)}x MOIC (${scenarios.bear.result.inputs.holdMonths}mo)

LOCALITY
${locality.airportName ? `  Airport: ${locality.airportName} — ${locality.airportKm} km` : ""}
${locality.cbdName ? `  CBD: ${locality.cbdName} — ${locality.cbdKm} km` : ""}
${locality.itHubName ? `  IT corridor: ${locality.itHubName} — ${locality.itHubKm} km` : ""}

DEAL-SPECIFIC DILIGENCE (already on the memo, do not duplicate in narrative):
${diligence.map((d, i) => `  ${i + 1}. ${d.title}`).join("\n")}

NARRATIVE STRUCTURE
- Paragraph 1 (~70-80 words): The opportunity — what's being sold, why it's distressed, the headline discount and what it implies.
- Paragraph 2 (~70-80 words): The thesis — why the DH Score, scenarios, and locality support a bid. Reference specific numbers.
- Paragraph 3 (~70-80 words): The action — what diligence to do first and what would change the recommendation.

RISK REGISTER GUIDANCE
- Exactly 3 risks specific to this deal (not generic SARFAESI risks).
- Severity reflects deal-specific likelihood, not abstract category.
- Each detail must mention what would mitigate or verify the risk.

Tone: declarative investor-memo prose. No headers. No bullet points inside paragraphs. No markdown.`;

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n")
      .trim();

    // Strip any accidental markdown fences
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.warn("[memo] Claude JSON parse failed, falling back:", e);
      return fallbackOutput(data);
    }

    const out = parsed as Partial<ClaudeOutput>;
    if (
      !Array.isArray(out.narrative) ||
      out.narrative.length < 2 ||
      !Array.isArray(out.risks) ||
      out.risks.length < 1
    ) {
      console.warn("[memo] Claude returned malformed shape, falling back");
      return fallbackOutput(data);
    }

    // Sanitise risks
    const allowedSeverities = new Set<Risk["severity"]>(["low", "medium", "high"]);
    const risks: Risk[] = (out.risks as unknown[])
      .filter(
        (r): r is Risk =>
          typeof r === "object" &&
          r !== null &&
          typeof (r as Risk).title === "string" &&
          typeof (r as Risk).detail === "string" &&
          allowedSeverities.has((r as Risk).severity)
      )
      .slice(0, 3);

    return {
      narrative: out.narrative.slice(0, 3),
      risks: risks.length >= 1 ? risks : fallbackOutput(data).risks,
    };
  } catch (err) {
    console.warn("[memo] Claude call failed, using fallback:", err);
    return fallbackOutput(data);
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signalsPayload = parseJsonField<SignalsPayload | null>(property.scoreSignals, null);
  const imageUrls = parseJsonField<string[]>(property.imageUrls, []);
  const heroImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

  const assumptions = defaultAssumptionsFor({
    reservePrice: property.reservePrice,
    estimatedFmv: property.estimatedFmv,
  });
  const financial = computeFinancialModel(assumptions);
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
      heroImageUrl,
    },
    signals: signalsPayload?.signals ?? null,
    explanations: signalsPayload?.explanations ?? null,
    financial,
    scenarios,
    sensitivity,
    locality,
    diligence,
  };

  const { narrative, risks } = await callClaude(baseData);

  const memoData: MemoData = { ...baseData, narrative, risks };
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
