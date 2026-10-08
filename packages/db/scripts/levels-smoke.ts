import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices, levelFromXp, progressFromXp, totalXpForLevel, xpToNext } from "../src";
import { guilds, levels } from "../src/schema";

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
await db.delete(levels).where(eq(levels.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await services.ensureGuild(G, "levels-smoke");

// ---- math ----
const m1 = xpToNext(0) === 100 && xpToNext(1) === 155 && xpToNext(2) === 220;
const m2 = levelFromXp(0) === 0 && levelFromXp(99) === 0 && levelFromXp(100) === 1 && levelFromXp(255) === 2;
const pr = progressFromXp(120);
const m3 = pr.level === 1 && pr.into === 20 && pr.need === 155 && Math.abs(pr.ratio - 20 / 155) < 1e-9;
const m4 = totalXpForLevel(3) === 100 + 155 + 220;
console.log("math:", { m1, m2, m3, m4 });

// ---- grants ----
const g0 = await services.grantXp(G, "u1", 90);
const g1 = await services.grantXp(G, "u1", 15);
const g2 = await services.grantXp(G, "u2", 500);
console.log("grants:", `u1 ${g0.xp}->${g1.xp} (L${g0.level}->L${g1.level})`, `u2 L${g2.level}`);
const gOk = g0.level === 0 && g1.previousLevel === 0 && g1.level === 1 && g1.xp === 105 && g2.level === levelFromXp(500);

// ---- board ----
const top = await services.getTopLevels(G, 10);
const rankU1 = await services.getRank(G, "u1");
const rankU3 = await services.getRank(G, "u3");
const ranked = await services.countRanked(G);
const member = await services.getMemberLevel(G, "u1");
console.log("board:", top.map((t) => `${t.userId}:${t.xp}`).join(", "), "| rank u1:", rankU1, "| rank u3:", rankU3, "| ranked:", ranked);
const bOk =
  top.length === 2 && top[0]?.userId === "u2" && rankU1 === 2 && rankU3 === 3 && ranked === 2 && member?.xp === 105;

// cleanup
await db.delete(levels).where(eq(levels.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));

const pass = m1 && m2 && m3 && m4 && gOk && bOk;
console.log(pass ? "levels-smoke: PASS" : "levels-smoke: FAIL");
await pool.end();
process.exit(pass ? 0 : 1);
