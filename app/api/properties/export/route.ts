/**
 * GET /api/properties/export  →  CSV download of the filtered deal list.
 *
 * Accepts the same query params as GET /api/properties (city, type, bank,
 * minScore, maxPrice, possessionType, source, pipelineStage, sort) so the
 * "Download CSV" button on /deals can hand off its exact filter state.
 *
 * Unlike the listing endpoints this does NOT page — it streams every matching
 * row (capped at 5,000, comfortably above the current ~400-row dataset and the
 * free-tier headroom) so the export is a complete worksheet, not a screenful.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MAX_ROWS = 5000;

const QuerySchema = z.object({
  city: z.string().optional(),
  type: z.string().optional(),
  bank: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  possessionType: z.string().optional(),
  source: z.string().optional(),
  pipelineStage: z.string().optional(),
  sort: z.enum(["score", "discount", "price-asc", "price-desc", "auction"]).default("score"),
});

const HEADERS = [
  "Title",
  "Property Type",
  "Bank",
  "Source",
  "City",
  "State",
  "Pincode",
  "Address",
  "Reserve Price (INR)",
  "EMD (INR)",
  "Estimated FMV (INR)",
  "Discount %",
  "DH Score",
  "Built-up Area (sqft)",
  "Carpet Area (sqft)",
  "Bedrooms",
  "Possession",
  "Auction Date",
  "Auction Status",
  "Source URL",
  "DistressHub URL",
  "External ID",
] as const;

/** Quote a CSV cell per RFC 4180 only when it contains a delimiter, quote, or newline. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

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
  if (q.source) where.source = q.source;
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
    take: MAX_ROWS,
    select: {
      id: true,
      externalId: true,
      title: true,
      propertyType: true,
      bank: true,
      source: true,
      city: true,
      state: true,
      pincode: true,
      address: true,
      reservePrice: true,
      emdAmount: true,
      estimatedFmv: true,
      discountPct: true,
      dhScore: true,
      builtUpArea: true,
      carpetArea: true,
      bedrooms: true,
      possessionType: true,
      auctionDate: true,
      auctionStatus: true,
      sourceUrl: true,
    },
  });

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host");
  const origin = host ? `${proto}://${host}` : "";

  const lines = [HEADERS.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.title,
        r.propertyType,
        r.bank,
        r.source,
        r.city,
        r.state,
        r.pincode,
        r.address,
        r.reservePrice,
        r.emdAmount,
        r.estimatedFmv,
        r.discountPct,
        r.dhScore,
        r.builtUpArea,
        r.carpetArea,
        r.bedrooms,
        r.possessionType,
        r.auctionDate ? r.auctionDate.toISOString().slice(0, 10) : "",
        r.auctionStatus,
        r.sourceUrl,
        origin ? `${origin}/deals/${r.id}` : r.id,
        r.externalId,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  // Lead with a UTF-8 BOM so Excel detects the encoding; CRLF line endings per RFC 4180.
  const csv = "﻿" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="distresshub-deals-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
