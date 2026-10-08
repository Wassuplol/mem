import { count, eq } from "drizzle-orm";
import { createServices, guildSettings, guilds, modCases } from "@mem/db";
import { db } from "./db";
import { fetchManageableGuilds } from "./discord-guilds";

const services = createServices(db);

export interface GuildModuleState {
  id: string;
  configured: boolean;
  updatedAt: string | null;
}

export interface GuildDetail {
  guild: { id: string; name: string; icon: string | null; owner: boolean };
  /** True when Mem has been in this guild (a row exists in the guilds table). */
  joined: boolean;
  modules: GuildModuleState[];
  stats: { cases: number; openPolls: number; openGiveaways: number; rolePanels: number };
}

export type GuildDetailResult =
  | { ok: true; detail: GuildDetail }
  | { ok: false; status: number; error: string };

/**
 * Per-server overview for a signed-in user: guild header data (live from Discord),
 * module configuration states and quick stats. The user must manage the guild.
 */
export async function fetchGuildDetail(userId: string, guildId: string): Promise<GuildDetailResult> {
  const manageable = await fetchManageableGuilds(userId);
  if (!manageable.ok) return { ok: false, status: manageable.status, error: manageable.error };

  const guild = manageable.guilds.find((g) => g.id === guildId);
  if (!guild) return { ok: false, status: 403, error: "not_manageable" };

  const guildRows = await db.select({ id: guilds.id }).from(guilds).where(eq(guilds.id, guildId));
  const joined = guildRows.length > 0;

  let modules: GuildModuleState[] = [];
  let stats = { cases: 0, openPolls: 0, openGiveaways: 0, rolePanels: 0 };

  if (joined) {
    const rows = await db
      .select({ moduleId: guildSettings.moduleId, updatedAt: guildSettings.updatedAt })
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guildId));
    modules = rows.map((r) => ({
      id: r.moduleId,
      configured: true,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : null,
    }));

    const caseRows = await db.select({ n: count() }).from(modCases).where(eq(modCases.guildId, guildId));
    const [polls, giveaways, panels] = await Promise.all([
      services.listOpenPolls(guildId, 50),
      services.listGiveaways(guildId, { openOnly: true, limit: 25 }),
      services.listRolePanels(guildId, 25),
    ]);
    stats = {
      cases: Number(caseRows[0]?.n ?? 0),
      openPolls: polls.length,
      openGiveaways: giveaways.length,
      rolePanels: panels.length,
    };
  }

  return { ok: true, detail: { guild, joined, modules, stats } };
}
