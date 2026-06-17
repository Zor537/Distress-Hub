/**
 * Data-layer entry point.
 *
 * Re-exports the in-memory store as `prisma` so existing route handlers and
 * pages keep their `import { prisma } from "@/lib/db"` syntax untouched.
 *
 * The in-memory store is the only runtime backend — it works identically on
 * local dev and Vercel serverless. The `prisma/` schema + migrations remain
 * for documentation and future Postgres swap (just replace this file's
 * export with a real PrismaClient).
 */
export { store as prisma } from "./store";
