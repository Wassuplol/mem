import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb, createServices } from "../src";
import { guilds, rolePanelEntries, rolePanels } from "../src/schema";

for (const candidate of [resolve("../../.env"), resolve(".env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const { db, pool } = createDb();
const services = createServices(db);
const G = "0";

// clean any leftovers (entries cascade off panels)
await db.delete(rolePanels).where(eq(rolePanels.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));

await services.ensureGuild(G, "rrole-smoke");

/* --- create panel + entries --- */
const panel = await services.createRolePanel({
  guildId: G,
  channelId: "10",
  messageId: "500",
  title: "Pick your roles",
  description: "Color + ping roles",
});
const e1 = await services.addRolePanelEntry({ panelId: panel.id, roleId: "r1", emoji: "🎨", label: "Artist" });
const e2 = await services.addRolePanelEntry({ panelId: panel.id, roleId: "r2", emoji: null, label: "Pings" });
console.log("panel created:", panel.title, "| entries:", (await services.listRolePanelEntries(panel.id)).length);

/* --- idempotent upsert (same role re-added updates emoji/label) --- */
const e1b = await services.addRolePanelEntry({ panelId: panel.id, roleId: "r1", emoji: "🖌️", label: "Painter" });
const afterUpsert = await services.listRolePanelEntries(panel.id);
console.log("upsert:", e1b.id === e1.id, "| emoji now:", afterUpsert.find((x) => x.roleId === "r1")?.emoji);

/* --- lookups --- */
const byMessage = await services.getRolePanelByMessage("500");
console.log("by message:", byMessage?.id === panel.id ? "ok" : "MISS");
const byMessageMissing = await services.getRolePanelByMessage("123");
console.log("by message missing:", byMessageMissing);
const latest = await services.getLatestRolePanel(G);
console.log("latest:", latest?.id === panel.id ? "ok" : "MISS");

/* --- count + list --- */
const count = await services.countRolePanelEntries(panel.id);
const panels = await services.listRolePanels(G);
console.log("count:", count, "| panels:", panels.length);

/* --- remove --- */
const removed = await services.removeRolePanelEntry(panel.id, "r2");
const removedAgain = await services.removeRolePanelEntry(panel.id, "r2");
const countAfter = await services.countRolePanelEntries(panel.id);
console.log("remove:", removed, "| remove again:", removedAgain, "| count after:", countAfter);

/* --- cascade: deleting the panel wipes its entries --- */
await services.deleteRolePanel(panel.id);
const orphans = await db.select().from(rolePanelEntries).where(eq(rolePanelEntries.panelId, panel.id));
const panelGone = await services.getRolePanel(panel.id);
console.log("cascade: entries left:", orphans.length, "| panel gone:", panelGone === null);

const pass =
  e2 !== null &&
  e1b.id === e1.id &&
  afterUpsert.find((x) => x.roleId === "r1")?.emoji === "🖌️" &&
  afterUpsert.find((x) => x.roleId === "r1")?.label === "Painter" &&
  byMessage?.id === panel.id &&
  byMessageMissing === null &&
  latest?.id === panel.id &&
  count === 2 &&
  panels.length === 1 &&
  removed === true &&
  removedAgain === false &&
  countAfter === 1 &&
  orphans.length === 0 &&
  panelGone === null;
console.log(pass ? "RROLE SMOKE OK" : "RROLE SMOKE FAILED");
if (!pass) process.exitCode = 1;

// cleanup
await db.delete(rolePanels).where(eq(rolePanels.guildId, G));
await db.delete(guilds).where(eq(guilds.id, G));
await pool.end();
