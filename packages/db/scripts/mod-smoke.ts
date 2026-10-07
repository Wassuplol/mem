import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { guildSettings, guilds, modCases } from "../src/schema";

for (const candidate of [resolve("../../.env"), resolve(".env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const { db, pool } = createDb();
const services = createServices(db);
const G = "0";

// clean any leftovers
await db.delete(modCases).where(eq(modCases.guildId, G));
await db.delete(guildSettings).where(eq(guildSettings.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));

await services.ensureGuild(G, "mod-smoke");
await services.setModuleConfig(G, "smoke", { ok: true });
const cfg = await services.getModuleConfig<{ ok: boolean }>(G, "smoke");
console.log("config roundtrip:", cfg);

const c1 = await services.createCase({ guildId: G, action: "warn", targetId: "42", moderatorId: "1", reason: "first" });
const c2 = await services.createCase({ guildId: G, action: "warn", targetId: "42", moderatorId: "1", reason: "second" });
console.log("case numbers:", c1.caseNumber, c2.caseNumber);

const warns = await services.listActiveWarnings(G, "42");
console.log("active warnings:", warns.length);
const cleared = await services.clearActiveWarnings(G, "42");
console.log("cleared:", cleared);
const after = await services.listActiveWarnings(G, "42");
console.log("after clear:", after.length);

// cleanup
await db.delete(modCases).where(eq(modCases.guildId, G));
await db.delete(guildSettings).where(eq(guildSettings.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));

const pass =
  cfg?.ok === true && c1.caseNumber === 1 && c2.caseNumber === 2 && warns.length === 2 && cleared === 2 && after.length === 0;
console.log(pass ? "MOD SMOKE OK" : "MOD SMOKE FAILED");
if (!pass) process.exitCode = 1;
await pool.end();
