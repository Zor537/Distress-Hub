/**
 * Prisma client singleton, backed by Supabase Postgres via the @prisma/adapter-pg driver.
 *
 * Uses the transaction pooler URL (port 6543) for serverless-friendly connection re-use.
 * Direct URL is reserved for Prisma Migrate (see prisma.config.ts).
 *
 * The in-memory store at lib/store.ts is now obsolete — kept only so historical commits
 * in git remain readable; safe to delete once we've verified production for a week.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
