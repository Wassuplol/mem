import { eq } from "drizzle-orm";
import { createDb } from "../src/client";
import { guildSettings, guilds } from "../src/schema";

const { db, pool } = createDb(
  process.env.DATABASE_URL ?? "postgresql://mem:mem@localhost:5432/mem",
);

const GUILD = "0";

await db
  .insert(guilds)
  .values({ id: GUILD, name: "smoke-test" })
  .onConflictDoUpdate({ target: guilds.id, set: { name: "smoke-test", updatedAt: new Date() } });

const guildRows = await db.select().from(guilds).where(eq(guilds.id, GUILD));
console.log("guild row:", guildRows[0]);

await db
  .insert(guildSettings)
  .values({ guildId: GUILD, moduleId: "smoke", config: { ok: true } })
  .onConflictDoUpdate({
    target: [guildSettings.guildId, guildSettings.moduleId],
    set: { config: { ok: true }, updatedAt: new Date() },
  });

const settingRows = await db.select().from(guildSettings).where(eq(guildSettings.guildId, GUILD));
console.log("setting rows:", settingRows);

await pool.end();
console.log("SMOKE OK");
