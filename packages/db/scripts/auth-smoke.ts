import crypto from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb } from "../src/client";
import { session, user } from "../src/schema";

/**
 * Auth smoke test: creates a throwaway user + session directly in the database,
 * signs the session cookie exactly like Better Auth does (HMAC-SHA256, base64),
 * and verifies the running server accepts it end-to-end.
 *
 * Usage (server must be up):
 *   pnpm --filter @mem/db exec tsx scripts/auth-smoke.ts run      # verify only
 *   pnpm --filter @mem/db exec tsx scripts/auth-smoke.ts cookie   # verify + write cookie file (for browser tests)
 *   pnpm --filter @mem/db exec tsx scripts/auth-smoke.ts cleanup  # remove test rows
 */

for (const candidate of [resolve("../../.env"), resolve(".env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.BETTER_AUTH_SECRET;
if (!SECRET) {
  console.error("[auth-smoke] BETTER_AUTH_SECRET missing (root .env)");
  process.exit(1);
}

const TEST_EMAIL = "smoke@mem.local";
const mode = process.argv[2] ?? "run";

const { db, pool } = createDb();

const sign = (value: string) => crypto.createHmac("sha256", SECRET).update(value).digest("base64");
const signedCookie = (token: string) => `${token}.${sign(token)}`;

async function cleanup(): Promise<void> {
  const rows = await db.select().from(user).where(eq(user.email, TEST_EMAIL));
  for (const row of rows) {
    await db.delete(session).where(eq(session.userId, row.id));
    await db.delete(user).where(eq(user.id, row.id));
  }
  console.log(`[auth-smoke] cleanup: removed ${rows.length} test user(s) + their sessions`);
}

async function createSession(): Promise<string> {
  await cleanup();
  const userId = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(user).values({
    id: userId,
    name: "Smoke Test",
    email: TEST_EMAIL,
    emailVerified: true,
  });
  await db.insert(session).values({
    id: crypto.randomUUID(),
    token,
    expiresAt,
    userId,
  });

  return signedCookie(token);
}

async function verifyOnServer(cookie: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/auth/get-session`, {
    headers: { cookie: `better-auth.session_token=${cookie}` },
  });
  const body = (await res.json().catch(() => null)) as {
    user?: { email?: string };
  } | null;
  console.log(`[auth-smoke] GET /api/auth/get-session -> HTTP ${res.status}`);
  console.log(`[auth-smoke] user resolved: ${JSON.stringify(body?.user ?? body)}`);
  return body?.user?.email === TEST_EMAIL;
}

if (mode === "cleanup") {
  await cleanup();
} else {
  const cookie = await createSession();
  console.log(`[auth-smoke] signed cookie created (${cookie.slice(0, 18)}...)`);
  const ok = await verifyOnServer(cookie);
  console.log(ok ? "[auth-smoke] PASS - session validated end-to-end" : "[auth-smoke] FAIL - server rejected the session");
  if (!ok) process.exitCode = 1;
  if (mode === "cookie") {
    const file = process.env.SMOKE_COOKIE_FILE ?? join(tmpdir(), "mem-smoke-cookie.txt");
    writeFileSync(file, cookie, "utf-8");
    console.log(`[auth-smoke] full cookie written to: ${file}`);
  }
}

await pool.end();
