import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { apiKeys, guilds, modCases } from "../src/schema";

for (const candidate of [resolve("../../.env"), resolve(".env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const BASE = process.env.API_SMOKE_BASE ?? "http://localhost:3000";
const { db, pool } = createDb();
const services = createServices(db);
const G = "999000000000000001";
const OTHER = "999000000000000002";

// clean leftovers
await db.delete(apiKeys).where(eq(apiKeys.guildId, G));
await db.delete(modCases).where(eq(modCases.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await db.delete(guilds).where(eq(guilds.id, OTHER));
await services.ensureGuild(G, "api-smoke");
await services.ensureGuild(OTHER, "api-smoke-other");

// seed one case so /cases has data
await services.createCase({ guildId: G, action: "warn", targetId: "111", moderatorId: "222", reason: "smoke" });

const { rawKey } = await services.createApiKey({ guildId: G, name: "smoke-key", createdBy: "smoke" });

const call = async (path: string, key?: string) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body: body as Record<string, unknown> };
};

/* --- no key -> 401 --- */
const anon = await call(`/api/v1/guilds/${G}/cases`);
console.log("anon:", anon.status, (anon.body as { error?: string })?.error);

/* --- bad key -> 401 --- */
const bad = await call(`/api/v1/guilds/${G}/cases`, "mem_not_a_real_key");
console.log("bad key:", bad.status);

/* --- good key -> 200 + data --- */
const good = await call(`/api/v1/guilds/${G}/cases`, rawKey);
const casesData = (good.body as { data?: unknown[] })?.data ?? [];
console.log("good key:", good.status, "| cases:", casesData.length);

/* --- wrong guild -> 403 --- */
const wrong = await call(`/api/v1/guilds/${OTHER}/cases`, rawKey);
console.log("wrong guild:", wrong.status, (wrong.body as { error?: string })?.error);

/* --- me + index --- */
const me = await call("/api/v1/me", rawKey);
const idx = await call("/api/v1");
console.log("me:", me.status, "| index:", idx.status);

/* --- revoked key -> 401 --- */
await services.revokeApiKey(G, (await services.listApiKeys(G))[0]?.id ?? "");
const revoked = await call(`/api/v1/guilds/${G}/cases`, rawKey);
console.log("revoked:", revoked.status);

const pass =
  anon.status === 401 &&
  bad.status === 401 &&
  good.status === 200 &&
  casesData.length === 1 &&
  wrong.status === 403 &&
  me.status === 200 &&
  idx.status === 200 &&
  revoked.status === 401;
console.log(pass ? "API SMOKE OK" : "API SMOKE FAILED");
if (!pass) process.exitCode = 1;

// cleanup
await db.delete(apiKeys).where(eq(apiKeys.guildId, G));
await db.delete(modCases).where(eq(modCases.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await db.delete(guilds).where(eq(guilds.id, OTHER));
await pool.end();
