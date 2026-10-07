import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { giveaways, guilds } from "../src/schema";

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
await db.delete(giveaways).where(eq(giveaways.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await services.ensureGuild(G, "giveaway-smoke");

/* --- create + attach message --- */
const gw = await services.createGiveaway({
  guildId: G,
  channelId: "10",
  hostId: "h1",
  prize: "Smoke Prize",
  winnerCount: 2,
  endsAt: new Date(Date.now() + 3_600_000),
});
await services.attachGiveawayMessage(gw.id, "msg1");
const fetched = await services.getGiveaway(gw.id);
const byMessage = await services.getGiveawayByMessage("msg1");
console.log("created:", fetched?.prize, "| by message:", byMessage?.id === gw.id);

/* --- entries: toggle on/off/on, then more users --- */
const e1 = await services.toggleGiveawayEntry(gw.id, "u1");
const e1again = await services.toggleGiveawayEntry(gw.id, "u1");
const e1third = await services.toggleGiveawayEntry(gw.id, "u1");
await services.toggleGiveawayEntry(gw.id, "u2");
await services.toggleGiveawayEntry(gw.id, "u3");
const count = await services.countGiveawayEntries(gw.id);
console.log("toggles:", e1, e1again, e1third, "| count:", count);

/* --- finish freezes + stores winners; a second finish returns null --- */
const finished = await services.finishGiveaway(gw.id, ["u1", "u2"]);
const again = await services.finishGiveaway(gw.id, ["u3"]);
console.log("finish winners:", finished?.winners?.join(","), "| second finish:", again);

/* --- entries locked after end --- */
let locked = false;
try {
  await services.toggleGiveawayEntry(gw.id, "u4");
} catch {
  locked = true;
}
console.log("locked after end:", locked);

/* --- reroll + listing filters --- */
const rerolled = await services.setGiveawayWinners(gw.id, ["u3"]);
const open = await services.listGiveaways(G, { openOnly: true });
const all = await services.listGiveaways(G, {});
console.log("reroll winners:", rerolled?.winners?.join(","), "| open:", open.length, "| all:", all.length);

const pass =
  fetched?.prize === "Smoke Prize" &&
  byMessage?.id === gw.id &&
  e1 === "entered" &&
  e1again === "left" &&
  e1third === "entered" &&
  count === 3 &&
  finished?.winners?.length === 2 &&
  again === null &&
  locked === true &&
  rerolled?.winners?.[0] === "u3" &&
  open.length === 0 &&
  all.length === 1;
console.log(pass ? "GIVEAWAY SMOKE OK" : "GIVEAWAY SMOKE FAILED");
if (!pass) process.exitCode = 1;

// cleanup (entries cascade with the giveaway)
await db.delete(giveaways).where(eq(giveaways.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await pool.end();
