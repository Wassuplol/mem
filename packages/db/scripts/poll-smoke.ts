import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { guildSettings, guilds, polls } from "../src/schema";

for (const candidate of [resolve("../../.env"), resolve(".env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const { db, pool } = createDb();
const services = createServices(db);
const G = "0";

// clean any leftovers (poll_votes cascade off polls)
await db.delete(polls).where(eq(polls.guildId, G));
await db.delete(guildSettings).where(eq(guildSettings.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));

await services.ensureGuild(G, "poll-smoke");

/* --- single-choice toggle + move --- */
const single = await services.createPoll({
  guildId: G,
  channelId: "10",
  authorId: "1",
  question: "Pizza or sushi?",
  options: ["Pizza", "Sushi", "Tacos"],
});
await services.attachPollMessage(single.id, "99");
console.log("poll created:", single.options.length, "options, multiple:", single.multiple);

const a1 = await services.votePoll(single.id, "u1", 0);
const t1 = await services.getPollTally(single.id);
console.log("vote add:", a1, "counts:", t1.counts.join(","), "voters:", t1.voterCount);

const a2 = await services.votePoll(single.id, "u1", 0); // toggle off
const t2 = await services.getPollTally(single.id);
console.log("toggle off:", a2, "total:", t2.totalVotes);

await services.votePoll(single.id, "u1", 0);
await services.votePoll(single.id, "u1", 1); // single-choice move
const t3 = await services.getPollTally(single.id);
console.log("single-choice move counts:", t3.counts.join(","));

/* --- multi-choice keeps both --- */
const multi = await services.createPoll({
  guildId: G,
  channelId: "10",
  authorId: "1",
  question: "Which toppings?",
  options: ["Cheese", "Pepperoni", "Mushrooms"],
  multiple: true,
  durationMinutes: 30,
});
await services.votePoll(multi.id, "u1", 0);
await services.votePoll(multi.id, "u1", 2);
await services.votePoll(multi.id, "u2", 0);
const t4 = await services.getPollTally(multi.id);
console.log("multi counts:", t4.counts.join(","), "voters:", t4.voterCount, "total:", t4.totalVotes);

/* --- lookup by message, end, list --- */
const byMsg = await services.getPollByMessage("99");
console.log("by message:", byMsg?.question);
const byMsgMissing = await services.getPollByMessage("123");
console.log("by message missing:", byMsgMissing);

const openBefore = await services.listOpenPolls(G);
await services.closePoll(single.id);
const openAfter = await services.listOpenPolls(G);
const closedPoll = await services.getPoll(single.id);
const endsAtSet = multi.endsAt !== null;
await services.setModuleConfig(G, "smoke", { ok: true }); // unrelated table still fine

const pass =
  single.options.length === 3 &&
  single.multiple === false &&
  a1 === "added" &&
  t1.counts.join(",") === "1,0,0" &&
  t1.voterCount === 1 &&
  a2 === "removed" &&
  t2.totalVotes === 0 &&
  t3.counts.join(",") === "0,1,0" &&
  t3.voterCount === 1 &&
  multi.multiple === true &&
  t4.counts.join(",") === "2,0,1" &&
  t4.voterCount === 2 &&
  t4.totalVotes === 3 &&
  byMsg?.id === single.id &&
  byMsgMissing === null &&
  openBefore.length === 2 &&
  openAfter.length === 1 &&
  openAfter[0]?.id === multi.id &&
  closedPoll?.closed === true &&
  endsAtSet;
console.log(pass ? "POLL SMOKE OK" : "POLL SMOKE FAILED");
if (!pass) process.exitCode = 1;

// cleanup
await db.delete(polls).where(eq(polls.guildId, G));
await db.delete(guildSettings).where(eq(guildSettings.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await pool.end();
