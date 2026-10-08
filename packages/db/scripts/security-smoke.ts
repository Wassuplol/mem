import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { guilds } from "../src/schema";

for (const candidate of [resolve("../../.env"), resolve(".env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const { db, pool } = createDb();
const services = createServices(db);
const G = "0";

type SecurityConfig = {
  alertChannelId?: string | null;
  antispam?: boolean | { enabled: boolean; max: number; windowSec: number; timeoutMin: number };
  antiraid?: boolean | { enabled: boolean; joins: number; windowSec: number };
  antinuke?: boolean | { enabled: boolean; actions: number; windowSec: number };
  screening?: { enabled: boolean; minAgeDays: number };
  trust?: string[];
  quarantined?: Array<{ userId: string; roleIds: string[]; at: string }>;
  lockdown?: { active: boolean; at: string; reason: string; channels: Array<{ id: string; allow: string | null; deny: string | null }> } | null;
};

await db.delete(guilds).where(eq(guilds.id, G));
await services.ensureGuild(G, "security-smoke");

const cfg: SecurityConfig = {
  alertChannelId: "chan-1",
  antispam: { enabled: true, max: 12, windowSec: 10, timeoutMin: 15 },
  antiraid: { enabled: true, joins: 14, windowSec: 45 },
  antinuke: { enabled: false, actions: 6, windowSec: 20 },
  screening: { enabled: true, minAgeDays: 7 },
  trust: ["u1", "u2"],
  quarantined: [{ userId: "u3", roleIds: ["r1", "r2"], at: new Date().toISOString() }],
  lockdown: {
    active: true,
    at: new Date().toISOString(),
    reason: "raid",
    channels: [
      { id: "ch1", allow: "2048", deny: "0" },
      { id: "ch2", allow: null, deny: null },
    ],
  },
};

await services.setModuleConfig(G, "security", cfg);
const back = await services.getModuleConfig<SecurityConfig>(G, "security");

const spam = typeof back?.antispam === "object" ? back.antispam : null;
const raid = typeof back?.antiraid === "object" ? back.antiraid : null;
const nuke = typeof back?.antinuke === "object" ? back.antinuke : null;

const pass1 =
  back?.alertChannelId === "chan-1" &&
  spam?.max === 12 && spam?.windowSec === 10 && spam?.timeoutMin === 15 &&
  raid?.joins === 14 && raid?.windowSec === 45 &&
  nuke?.enabled === false && nuke?.actions === 6 &&
  back?.screening?.minAgeDays === 7 &&
  back?.trust?.length === 2 &&
  back?.quarantined?.[0]?.roleIds.length === 2 &&
  back?.lockdown?.active === true &&
  back?.lockdown?.channels.length === 2 &&
  back?.lockdown?.channels[1]?.allow === null;

// lift lockdown
const lifted: SecurityConfig = { ...(back ?? {}), lockdown: null };
await services.setModuleConfig(G, "security", lifted);
const back2 = await services.getModuleConfig<SecurityConfig>(G, "security");
const pass2 = back2?.lockdown === null && back2?.trust?.length === 2;

await db.delete(guilds).where(eq(guilds.id, G));
const pass = pass1 && pass2;
console.log("round-trip ok:", pass1, "| lockdown lift ok:", pass2);
console.log(pass ? "security-smoke: PASS" : "security-smoke: FAIL");
await pool.end();
process.exit(pass ? 0 : 1);
