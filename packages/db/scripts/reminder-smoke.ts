import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { guilds, reminders } from "../src/schema";

for (const candidate of [resolve("../../.env"), resolve(".env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const { db, pool } = createDb();
const services = createServices(db);
const G = "0";
const U = "u1";

// clean any leftovers
await db.delete(reminders).where(eq(reminders.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));

await services.ensureGuild(G, "reminder-smoke");

/* --- create: two overdue (different users), two future for the same user --- */
const past = await services.createReminder({
  guildId: G,
  channelId: "10",
  userId: U,
  message: "past",
  remindAt: new Date(Date.now() - 60_000),
});
const future = await services.createReminder({
  guildId: G,
  channelId: "10",
  userId: U,
  message: "future",
  remindAt: new Date(Date.now() + 3_600_000),
});
const keep = await services.createReminder({
  guildId: G,
  channelId: "10",
  userId: U,
  message: "keep",
  remindAt: new Date(Date.now() + 7_200_000),
});
const other = await services.createReminder({
  guildId: G,
  channelId: "10",
  userId: "u2",
  message: "other",
  remindAt: new Date(Date.now() - 5_000),
});

/* --- due scan sees both overdue, oldest first --- */
const due = await services.listDueReminders(25);
console.log("due:", due.map((r) => r.message).join(","), "| first:", due[0]?.message);

/* --- per-user listing + count (only unsent) --- */
const mine = await services.listUserReminders(G, U, 10);
const countMine = await services.countUserReminders(G, U);
console.log("mine:", mine.length, "| count:", countMine, "| order:", mine.map((r) => r.message).join(","));

/* --- mark sent removes from due; sent rows cannot be deleted by the user --- */
await services.markReminderSent(past.id);
const dueAfter = await services.listDueReminders(25);
const deleteSent = await services.deleteUserReminder(past.id, U);
console.log("due after:", dueAfter.length, "| delete sent:", deleteSent);

/* --- delete: owner only --- */
const notOwner = await services.deleteUserReminder(future.id, "u9");
const ownDelete = await services.deleteUserReminder(future.id, U);
const countAfter = await services.countUserReminders(G, U);
console.log("not owner:", notOwner, "| own delete:", ownDelete, "| count after:", countAfter);

/* --- purge: old sent rows dropped, recent sent + pending kept --- */
await db
  .update(reminders)
  .set({ sentAt: new Date(Date.now() - 60 * 86_400_000) })
  .where(eq(reminders.id, other.id));
const purged = await services.purgeSentReminders(30);
const left = await db.select().from(reminders).where(eq(reminders.guildId, G));
console.log("purged:", purged, "| left:", left.map((r) => r.message).join(","));

const pass =
  due.length === 2 &&
  due[0]?.message === "past" &&
  mine.length === 3 &&
  countMine === 3 &&
  mine[2]?.message === "keep" &&
  dueAfter.length === 1 &&
  dueAfter[0]?.message === "other" &&
  deleteSent === false &&
  notOwner === false &&
  ownDelete === true &&
  countAfter === 1 &&
  purged === 1 &&
  left.length === 2;
console.log(pass ? "REMINDER SMOKE OK" : "REMINDER SMOKE FAILED");
if (!pass) process.exitCode = 1;

// cleanup
await db.delete(reminders).where(eq(reminders.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await pool.end();
