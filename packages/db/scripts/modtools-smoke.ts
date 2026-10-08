import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { guilds, modCases, modNotes } from "../src/schema";

for (const candidate of [resolve("../../.env"), resolve(".env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const { db, pool } = createDb();
const services = createServices(db);
const G = "0";
const U = "111111111111111111";
const M = "222222222222222222";

await db.delete(modNotes).where(eq(modNotes.guildId, G));
await db.delete(modCases).where(eq(modCases.guildId, G));
await services.ensureGuild(G, "modtools-smoke");

/* notes */
const n1 = await services.addNote({ guildId: G, userId: U, authorId: M, content: "first note" });
await services.addNote({ guildId: G, userId: U, authorId: M, content: "second note" });
const listed = await services.listNotes(G, U);
const count = await services.countNotes(G, U);
if (listed.length !== 2 || count !== 2) throw new Error(`notes mismatch: ${listed.length}/${count}`);
console.log("notes ok:", listed.length, "count", count);

const removed = await services.removeNoteByPrefix(G, n1.id.slice(0, 8));
if (!removed || removed.id !== n1.id) throw new Error("removeNoteByPrefix failed");
if ((await services.countNotes(G, U)) !== 1) throw new Error("count after remove");
console.log("remove ok:", removed.id.slice(0, 8));

/* modstats */
await services.createCase({ guildId: G, action: "warn", targetId: U, moderatorId: M, reason: "smoke" });
await services.createCase({ guildId: G, action: "warn", targetId: U, moderatorId: M, reason: "smoke2" });
await services.createCase({ guildId: G, action: "ban", targetId: U, moderatorId: M, reason: "smoke3" });
const stats = await services.modStats(G, M);
const warn = stats.find((s) => s.action === "warn");
const ban = stats.find((s) => s.action === "ban");
if (!warn || warn.total !== 2 || warn.recent !== 2) throw new Error(`modStats warn: ${JSON.stringify(warn)}`);
if (!ban || ban.total !== 1) throw new Error(`modStats ban: ${JSON.stringify(ban)}`);
console.log("modstats ok:", JSON.stringify(stats));

/* cleanup */
await db.delete(modNotes).where(eq(modNotes.guildId, G));
await db.delete(modCases).where(eq(modCases.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));

console.log("MODTOOLS SMOKE OK");
await pool.end();
