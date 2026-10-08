import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { guilds, tickets } from "../src/schema";

for (const candidate of [resolve("../../.env"), resolve(".env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const { db, pool } = createDb();
const services = createServices(db);
const G = "0";

await db.delete(tickets).where(eq(tickets.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await services.ensureGuild(G, "tickets-smoke");

const t1 = await services.createTicket({ guildId: G, channelId: "chan-1", userId: "u1" });
await services.setTicketMessage(t1.id, "msg-1");
const t2 = await services.createTicket({ guildId: G, channelId: "chan-2", userId: "u2" });

const byChan = await services.getTicketByChannel("chan-1");
const open1 = await services.getOpenTicketForUser(G, "u1");
const claimed = await services.claimTicket(t2.id, "staff-9");
const claimedAgainOk = await services.claimTicket(t2.id, "staff-8"); // still open -> true
const closed = await services.closeTicket(t2.id, "resolved");
const closedAgain = await services.closeTicket(t2.id, "again"); // not open -> false
const open2After = await services.getOpenTicketForUser(G, "u2");
const list = await services.listTickets(G, { limit: 10 });
const listOpen = await services.listTickets(G, { status: "open" });
const openCount = await services.countOpenTickets(G);

console.log("t1:", t1.id.slice(0, 8), "| byChan msg:", byChan?.messageId, "| open u1:", open1?.channelId);
console.log("claims:", claimed, claimedAgainOk, "| close:", closed, closedAgain, "| open u2 after close:", open2After);
console.log("list all/open:", list.length, listOpen.length, "| openCount:", openCount);

// cleanup
await db.delete(tickets).where(eq(tickets.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));

const pass =
  byChan?.messageId === "msg-1" &&
  open1?.channelId === "chan-1" &&
  claimed === true &&
  claimedAgainOk === true &&
  closed === true &&
  closedAgain === false &&
  open2After === null &&
  list.length === 2 &&
  listOpen.length === 1 &&
  openCount === 1;

console.log(pass ? "tickets-smoke: PASS" : "tickets-smoke: FAIL");
await pool.end();
process.exit(pass ? 0 : 1);
