import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/** Creates a Drizzle client + pool. Pass a URL or set DATABASE_URL. */
export function createDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set - export it or pass a connection string");
  }
  const pool = new Pool({ connectionString });
  // Never let background/idle connection failures crash the process:
  // pg pools emit 'error' for idle clients, and unhandled it kills Node.
  pool.on("error", (error) => {
    console.error("[db] idle client error:", error instanceof Error ? error.message : error);
  });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
