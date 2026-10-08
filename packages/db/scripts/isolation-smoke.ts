import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { apiKeys, giveawayEntries, giveaways, guildSettings, guilds, levels, modCases, tickets } from "../src/schema";

for (const candidate of [resolve("../../.env"), resolve(".env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const { db, pool } = createDb();
const services = createServices(db);

const A = "iso-a";
const B = "iso-b";
const U = "shared-user"; // deliberately the SAME user id in both guilds

const results: Array<[string, boolean]> = [];
const check = (name: string, pass: boolean) => {
  results.push([name, pass]);
  if (!pass) console.log("  FAIL:", name);
};

/* ---------- setup ---------- */
for (const g of [A, B]) {
  await db.delete(modCases).where(eq(modCases.guildId, g)).catch(() => undefined);
  await db.delete(levels).where(eq(levels.guildId, g)).catch(() => undefined);
  await db.delete(tickets).where(eq(tickets.guildId, g)).catch(() => undefined);
  await db.delete(apiKeys).where(eq(apiKeys.guildId, g)).catch(() => undefined);
  const gw = await db.select({ id: giveaways.id }).from(giveaways).where(eq(giveaways.guildId, g)).catch(() => []);
  for (const row of gw) await db.delete(giveawayEntries).where(eq(giveawayEntries.giveawayId, row.id)).catch(() => undefined);
  await db.delete(giveaways).where(eq(giveaways.guildId, g)).catch(() => undefined);
  await db.delete(guilds).where(eq(guilds.id, g)).catch(() => undefined);
}
await services.ensureGuild(A, "Isolation A");
await services.ensureGuild(B, "Isolation B");

/* 1. module settings */
await services.setModuleConfig(A, "security", { alertChannelId: "chan-A", antispam: { enabled: false, max: 5, windowSec: 5, timeoutMin: 5 } });
await services.setModuleConfig(B, "security", { alertChannelId: "chan-B" });
const cfgA = await services.getModuleConfig<{ alertChannelId?: string }>(A, "security");
const cfgB = await services.getModuleConfig<{ alertChannelId?: string }>(B, "security");
check("settings: A reads A's config", cfgA?.alertChannelId === "chan-A");
check("settings: B reads B's config", cfgB?.alertChannelId === "chan-B");
const allSettings = await db.select({ guildId: guildSettings.guildId }).from(guildSettings).where(inArray(guildSettings.guildId, [A, B]));
check("settings: exactly one row per guild", allSettings.length === 2);

/* 2. mod cases */
await services.createCase({ guildId: A, action: "warn", targetId: "t1", moderatorId: "m1", reason: "a" });
await services.createCase({ guildId: B, action: "warn", targetId: "t1", moderatorId: "m1", reason: "b" });
const casesA = await services.listCases(A);
const casesB = await services.listCases(B);
check("cases: A list contains only A", casesA.length === 1 && casesA.every((c) => c.guildId === A));
check("cases: B list contains only B", casesB.length === 1 && casesB.every((c) => c.guildId === B));

/* 3. levels — same user id in both guilds */
await services.grantXp(A, U, 500);
await services.grantXp(B, U, 250);
const topA = await services.getTopLevels(A);
const lvlB = await services.getMemberLevel(B, U);
check("levels: A board only A", topA.length === 1 && topA[0]?.guildId === A && topA[0]?.xp === 500);
check("levels: same user id keeps separate XP per guild", lvlB?.xp === 250);
check("levels: other guild's only-user invisible", (await services.getMemberLevel(A, "user-b-only")) === null);

/* 4. tickets — same user in both guilds */
const tA = await services.createTicket({ guildId: A, channelId: "chan-tA", userId: U });
const tB = await services.createTicket({ guildId: B, channelId: "chan-tB", userId: U });
const openA = await services.getOpenTicketForUser(A, U);
const openB = await services.getOpenTicketForUser(B, U);
check("tickets: open-ticket resolves per guild (A)", openA?.channelId === "chan-tA");
check("tickets: open-ticket resolves per guild (B)", openB?.channelId === "chan-tB");
check("tickets: channel lookup stays in A", (await services.getTicketByChannel("chan-tA"))?.guildId === A);
await services.closeTicket(tB.id, "done");
const openA2 = await services.getOpenTicketForUser(A, U);
check("tickets: closing B never touches A", openA2?.id === tA.id && openA2?.status === "open");

/* 5. api keys */
const keyA = await services.createApiKey({ guildId: A, name: "iso", createdBy: U });
const hashA = createHash("sha256").update(keyA.rawKey).digest("hex");
check("apikeys: hash resolves to guild A", (await services.findApiKeyByHash(hashA))?.guildId === A);
check("apikeys: B cannot revoke A's key", (await services.revokeApiKey(B, keyA.row.id)) === false);
check("apikeys: B list does not leak A's key", (await services.listApiKeys(B)).every((k) => k.id !== keyA.row.id));
check("apikeys: A can revoke A's key", (await services.revokeApiKey(A, keyA.row.id)) === true);

/* 6. giveaways */
const gwA = await services.createGiveaway({
  guildId: A,
  channelId: "chan-gA",
  hostId: U,
  prize: "iso prize",
  winnerCount: 1,
  endsAt: new Date(Date.now() + 3_600_000),
});
await services.attachGiveawayMessage(gwA.id, "msg-gA");
check("giveaways: B list empty", (await services.listGiveaways(B)).length === 0);
check("giveaways: message lookup stays in A", (await services.getGiveawayByMessage("msg-gA"))?.guildId === A);

/* ---------- cleanup ---------- */
for (const g of [A, B]) {
  await db.delete(modCases).where(eq(modCases.guildId, g)).catch(() => undefined);
  await db.delete(levels).where(eq(levels.guildId, g)).catch(() => undefined);
  await db.delete(tickets).where(eq(tickets.guildId, g)).catch(() => undefined);
  await db.delete(apiKeys).where(eq(apiKeys.guildId, g)).catch(() => undefined);
  const gw = await db.select({ id: giveaways.id }).from(giveaways).where(eq(giveaways.guildId, g)).catch(() => []);
  for (const row of gw) await db.delete(giveawayEntries).where(eq(giveawayEntries.giveawayId, row.id)).catch(() => undefined);
  await db.delete(giveaways).where(eq(giveaways.guildId, g)).catch(() => undefined);
  await db.delete(guilds).where(eq(guilds.id, g)).catch(() => undefined);
}

const passed = results.filter(([, ok]) => ok).length;
console.log(`${passed}/${results.length} isolation checks passed`);
console.log(passed === results.length ? "isolation-smoke: PASS" : "isolation-smoke: FAIL");
await pool.end();
process.exit(passed === results.length ? 0 : 1);
