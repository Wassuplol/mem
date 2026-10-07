import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { guilds, scheduledTasks } from "../src/schema";

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
await db.delete(scheduledTasks).where(eq(scheduledTasks.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await services.ensureGuild(G, "scheduler-smoke");

/* --- schedule: one due, one future --- */
const dueTask = await services.scheduleTask({
  guildId: G,
  kind: "smoke_kind",
  payload: { n: 1 },
  runAt: new Date(Date.now() - 5_000),
});
const futureTask = await services.scheduleTask({
  guildId: G,
  kind: "smoke_kind",
  payload: { n: 2 },
  runAt: new Date(Date.now() + 3_600_000),
});

const due = await services.listDueTasks(25);
console.log("due:", due.length, "| first payload n:", due[0]?.payload.n);

/* --- payload patch --- */
await services.setTaskPayload(futureTask.id, { n: 22 });
const patched = await services.getTask(futureTask.id);
console.log("patched payload n:", patched?.payload.n);

/* --- done / failed states --- */
await services.markTaskDone(dueTask.id);
const dueAfter = await services.listDueTasks(25);
await services.markTaskFailed(futureTask.id, "smoke failure ".repeat(80));
const failed = await services.getTask(futureTask.id);
console.log(
  "due after done:",
  dueAfter.length,
  "| failed status:",
  failed?.status,
  "| error capped:",
  (failed?.error?.length ?? 0) <= 500,
);

/* --- cancel only works while pending --- */
const c1 = await services.scheduleTask({ guildId: G, kind: "smoke_kind", payload: {}, runAt: new Date(Date.now() + 60_000) });
const cancelOk = await services.cancelTask(c1.id);
const cancelAgain = await services.cancelTask(dueTask.id); // already done -> false
console.log("cancel pending:", cancelOk, "| cancel done:", cancelAgain);

/* --- purge: old finished rows dropped, recent finished + pending kept --- */
const p1 = await services.scheduleTask({ guildId: G, kind: "smoke_kind", payload: {}, runAt: new Date(Date.now() + 120_000) });
await db
  .update(scheduledTasks)
  .set({ doneAt: new Date(Date.now() - 60 * 86_400_000) })
  .where(eq(scheduledTasks.id, dueTask.id));
const purged = await services.purgeTasks(30);
const left = await db.select().from(scheduledTasks).where(eq(scheduledTasks.guildId, G));
console.log("purged:", purged, "| left:", left.length, "| statuses:", left.map((t) => t.status).sort().join(","));

const pass =
  due.length === 1 &&
  due[0]?.payload.n === 1 &&
  patched?.payload.n === 22 &&
  dueAfter.length === 0 &&
  failed?.status === "failed" &&
  (failed?.error?.length ?? 0) <= 500 &&
  cancelOk === true &&
  cancelAgain === false &&
  purged === 1 &&
  left.length === 2 &&
  left.some((t) => t.status === "failed") &&
  left.some((t) => t.status === "pending");
console.log(pass ? "SCHEDULER SMOKE OK" : "SCHEDULER SMOKE FAILED");
if (!pass) process.exitCode = 1;

// cleanup
await db.delete(scheduledTasks).where(eq(scheduledTasks.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await pool.end();
