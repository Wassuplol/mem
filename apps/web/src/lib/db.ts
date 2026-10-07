import { createDb } from "@mem/db";

/** Shared database handle for the dashboard (auth, API routes, server components). */
export const { db, pool } = createDb(
  process.env.DATABASE_URL ?? "postgresql://mem:***@localhost:5432/mem",
);
