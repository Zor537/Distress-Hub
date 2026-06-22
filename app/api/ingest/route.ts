import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeDHScore } from "@/lib/scoring";
import { PROPERTY_TYPES, POSSESSION_TYPES } from "@/lib/constants";

/**
 * Ingest endpoint for Python scrapers (BAANKNET, IBAPI, IIG, NARCL, NCLT, PSB).
 *
 * Auth — HMAC-SHA256 of the raw request body, hex-encoded, sent as the
 * `x-dh-signature` header. Compute on the scraper side:
 *
 *   sig = hmac.new(INGEST_SECRET, body_bytes, hashlib.sha256).hexdigest()
 *
 * Each call is idempotent on externalId — re-runs upsert instead of duplicating.
 */

const SOURCES = ["BAANKNET", "IBAPI", "IIG", "NARCL", "NCLT", "PSB", "MANUAL"] as const;

const ListingSchema = z.object({
  externalId: z.string().min(3).max(200),
  title: z.string().min(3).max(300),
  description: z.string().max(5000).optional(),
  propertyType: z.enum(PROPERTY_TYPES),
  bank: z.string().min(2).max(120),
  address: z.string().min(3).max(400),
  city: z.string().min(2).max(120),
  state: z.string().min(2).max(120),
  pincode: z.string().max(20).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  reservePrice: z.number().positive().max(1e12),
  emdAmount: z.number().positive().max(1e12).optional(),
  builtUpArea: z.number().positive().max(1e7).optional(),
  carpetArea: z.number().positive().max(1e7).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  auctionDate: z.string().datetime().optional(),
  possessionType: z.enum(POSSESSION_TYPES).optional(),
  imageUrls: z.array(z.string().url()).max(20).optional(),
  sourceUrl: z.string().url(),
});

const BodySchema = z.object({
  source: z.enum(SOURCES),
  listings: z.array(ListingSchema).min(1).max(1000),
});

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf-8").digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server missing INGEST_SECRET" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-dh-signature");
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Body is not valid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { source, listings } = parsed.data;

  const run = await prisma.ingestRun.create({
    data: {
      source,
      status: "RUNNING",
      listingsTotal: listings.length,
      listingsAdded: 0,
      listingsUpdated: 0,
      errorMessage: null,
      finishedAt: null,
    },
  });

  let added = 0;
  let updated = 0;
  const errors: Array<{ externalId: string; error: string }> = [];

  for (const l of listings) {
    try {
      const dh = computeDHScore({
        city: l.city,
        bank: l.bank,
        propertyType: l.propertyType,
        reservePrice: l.reservePrice,
        builtUpArea: l.builtUpArea,
        possessionType: l.possessionType,
      });

      // Real Prisma upsert returns just the row, no created/updated flag.
      // Detect existence first so we can keep clean telemetry counters.
      const existing = await prisma.property.findUnique({
        where: { externalId: l.externalId },
        select: { id: true },
      });

      await prisma.property.upsert({
        where: { externalId: l.externalId },
        update: {
          title: l.title,
          description: l.description ?? null,
          propertyType: l.propertyType,
          bank: l.bank,
          address: l.address,
          city: l.city,
          state: l.state,
          pincode: l.pincode ?? null,
          latitude: l.latitude ?? null,
          longitude: l.longitude ?? null,
          reservePrice: l.reservePrice,
          emdAmount: l.emdAmount ?? null,
          estimatedFmv: dh.estimatedFmv,
          discountPct: dh.discountPct,
          builtUpArea: l.builtUpArea ?? null,
          carpetArea: l.carpetArea ?? null,
          bedrooms: l.bedrooms ?? null,
          auctionDate: l.auctionDate ? new Date(l.auctionDate) : null,
          possessionType: l.possessionType ?? "UNKNOWN",
          dhScore: dh.score,
          scoreSignals: JSON.stringify({ signals: dh.signals, explanations: dh.explanations }),
          imageUrls: JSON.stringify(l.imageUrls ?? []),
          sourceUrl: l.sourceUrl,
        },
        create: {
          externalId: l.externalId,
          source,
          title: l.title,
          description: l.description ?? null,
          propertyType: l.propertyType,
          bank: l.bank,
          address: l.address,
          city: l.city,
          state: l.state,
          pincode: l.pincode ?? null,
          latitude: l.latitude ?? null,
          longitude: l.longitude ?? null,
          reservePrice: l.reservePrice,
          emdAmount: l.emdAmount ?? null,
          estimatedFmv: dh.estimatedFmv,
          discountPct: dh.discountPct,
          builtUpArea: l.builtUpArea ?? null,
          carpetArea: l.carpetArea ?? null,
          bedrooms: l.bedrooms ?? null,
          auctionDate: l.auctionDate ? new Date(l.auctionDate) : null,
          possessionType: l.possessionType ?? "UNKNOWN",
          auctionStatus: "UPCOMING",
          dhScore: dh.score,
          scoreSignals: JSON.stringify({ signals: dh.signals, explanations: dh.explanations }),
          pipelineStage: "INGESTED",
          notes: null,
          imageUrls: JSON.stringify(l.imageUrls ?? []),
          sourceUrl: l.sourceUrl,
        },
      });

      if (existing) updated++;
      else added++;
    } catch (err) {
      errors.push({
        externalId: l.externalId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const status = errors.length === 0 ? "SUCCESS" : errors.length === listings.length ? "FAILED" : "PARTIAL";

  await prisma.ingestRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      status,
      listingsAdded: added,
      listingsUpdated: updated,
      errorMessage: errors.length ? errors.slice(0, 5).map((e) => `${e.externalId}: ${e.error}`).join("; ") : null,
    },
  });

  return NextResponse.json({
    ok: status !== "FAILED",
    runId: run.id,
    source,
    added,
    updated,
    errors: errors.slice(0, 20),
  });
}
