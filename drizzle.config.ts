import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";

// Local SQLite file (same default as server/db.ts).
const dbPath = resolve(process.env.DATABASE_URL || "data/ascension.db");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
