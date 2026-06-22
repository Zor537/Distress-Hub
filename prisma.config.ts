import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Use direct connection for migrations (pooler doesn't support DDL)
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
