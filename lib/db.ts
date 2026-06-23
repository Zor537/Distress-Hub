/**
 * Prisma client singleton, backed by Supabase Postgres via the @prisma/adapter-pg driver.
 *
 * Uses the transaction pooler URL (port 6543) for serverless-friendly connection re-use.
 * Direct URL is reserved for Prisma Migrate (see prisma.config.ts).
 *
 * The in-memory store at lib/store.ts is now obsolete — kept only so historical commits
 * in git remain readable; safe to delete once we've verified production for a week.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Field allowlist for PUBLIC, unauthenticated property reads.
 * Deliberately omits internal operator fields — `notes` (free-text deal
 * commentary) and `pipelineStage` (reveals what we're bidding on / have won) —
 * so they never leak through the public API or CSV export.
 */
export const publicPropertySelect = {
  id: true,
  externalId: true,
  source: true,
  title: true,
  description: true,
  propertyType: true,
  bank: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  latitude: true,
  longitude: true,
  reservePrice: true,
  emdAmount: true,
  estimatedFmv: true,
  discountPct: true,
  builtUpArea: true,
  carpetArea: true,
  bedrooms: true,
  auctionDate: true,
  possessionType: true,
  auctionStatus: true,
  dhScore: true,
  scoreSignals: true,
  imageUrls: true,
  sourceUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PropertySelect;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
