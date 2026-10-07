import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { guildSettings, guilds, modCases, type ModCase } from "./schema";

type Db = NodePgDatabase<typeof schema>;

/** Data services shared by the bot, dashboard and scripts. */
export function createServices(db: Db) {
  return {
    /* ---------- guilds & settings ---------- */

    async ensureGuild(guildId: string, name?: string | null): Promise<void> {
      await db
        .insert(guilds)
        .values({ id: guildId, name: name ?? null })
        .onConflictDoUpdate({ target: guilds.id, set: { name: name ?? null, updatedAt: new Date() } });
    },

    async getModuleConfig<T = Record<string, unknown>>(
      guildId: string,
      moduleId: string,
    ): Promise<T | null> {
      const rows = await db
        .select()
        .from(guildSettings)
        .where(and(eq(guildSettings.guildId, guildId), eq(guildSettings.moduleId, moduleId)));
      const row = rows[0];
      return row ? (row.config as T) : null;
    },

    async setModuleConfig(guildId: string, moduleId: string, config: unknown): Promise<void> {
      await this.ensureGuild(guildId);
      await db
        .insert(guildSettings)
        .values({ guildId, moduleId, config })
        .onConflictDoUpdate({
          target: [guildSettings.guildId, guildSettings.moduleId],
          set: { config, updatedAt: new Date() },
        });
    },

    /* ---------- moderation cases ---------- */

    async createCase(input: {
      guildId: string;
      action: string;
      targetId: string;
      moderatorId: string;
      reason?: string | null;
    }): Promise<ModCase> {
      for (let attempt = 0; attempt < 3; attempt++) {
        const rows = await db
          .select({ max: sql<number>`coalesce(max(${modCases.caseNumber}), 0)` })
          .from(modCases)
          .where(eq(modCases.guildId, input.guildId));
        const caseNumber = Number(rows[0]?.max ?? 0) + 1;
        try {
          const [row] = await db
            .insert(modCases)
            .values({ id: randomUUID(), caseNumber, ...input })
            .returning();
          if (row) return row;
        } catch (error) {
          if (attempt === 2) throw error;
        }
      }
      throw new Error("Could not allocate a case number after 3 attempts");
    },

    async listActiveWarnings(guildId: string, targetId: string): Promise<ModCase[]> {
      return db
        .select()
        .from(modCases)
        .where(
          and(
            eq(modCases.guildId, guildId),
            eq(modCases.targetId, targetId),
            eq(modCases.action, "warn"),
            eq(modCases.active, true),
          ),
        )
        .orderBy(desc(modCases.createdAt))
        .limit(25);
    },

    async clearActiveWarnings(guildId: string, targetId: string): Promise<number> {
      const rows = await db
        .update(modCases)
        .set({ active: false })
        .where(
          and(
            eq(modCases.guildId, guildId),
            eq(modCases.targetId, targetId),
            eq(modCases.action, "warn"),
            eq(modCases.active, true),
          ),
        )
        .returning({ id: modCases.id });
      return rows.length;
    },

    async getCaseByNumber(guildId: string, caseNumber: number): Promise<ModCase | null> {
      const rows = await db
        .select()
        .from(modCases)
        .where(and(eq(modCases.guildId, guildId), eq(modCases.caseNumber, caseNumber)))
        .limit(1);
      return rows[0] ?? null;
    },

    /** Newest-first slice of a guild's cases, optionally for one target. */
    async listCases(guildId: string, opts: { targetId?: string; limit?: number } = {}): Promise<ModCase[]> {
      const where = opts.targetId
        ? and(eq(modCases.guildId, guildId), eq(modCases.targetId, opts.targetId))
        : eq(modCases.guildId, guildId);
      return db
        .select()
        .from(modCases)
        .where(where)
        .orderBy(desc(modCases.caseNumber))
        .limit(Math.min(Math.max(opts.limit ?? 10, 1), 25));
    },
  };
}

export type Services = ReturnType<typeof createServices>;
