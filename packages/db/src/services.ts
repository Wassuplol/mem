import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { guildSettings, guilds, modCases, pollVotes, polls, type ModCase, type Poll } from "./schema";

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

    /* ---------- polls ---------- */

    async createPoll(input: {
      guildId: string;
      channelId?: string | null;
      authorId: string;
      question: string;
      options: string[];
      multiple?: boolean;
      durationMinutes?: number | null;
    }): Promise<Poll> {
      const endsAt =
        input.durationMinutes && input.durationMinutes > 0
          ? new Date(Date.now() + input.durationMinutes * 60_000)
          : null;
      const [row] = await db
        .insert(polls)
        .values({
          id: randomUUID(),
          guildId: input.guildId,
          channelId: input.channelId ?? null,
          authorId: input.authorId,
          question: input.question,
          options: input.options,
          multiple: input.multiple ?? false,
          endsAt,
        })
        .returning();
      if (!row) throw new Error("Could not create poll");
      return row;
    },

    async attachPollMessage(pollId: string, messageId: string): Promise<void> {
      await db.update(polls).set({ messageId }).where(eq(polls.id, pollId));
    },

    async getPoll(pollId: string): Promise<Poll | null> {
      const rows = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1);
      return rows[0] ?? null;
    },

    async getPollByMessage(messageId: string): Promise<Poll | null> {
      const rows = await db.select().from(polls).where(eq(polls.messageId, messageId)).limit(1);
      return rows[0] ?? null;
    },

    /**
     * Toggle a vote (same option twice = un-vote). Single-choice polls first
     * clear the user's other votes; multi-choice polls keep them.
     */
    async votePoll(pollId: string, userId: string, optionIndex: number): Promise<"added" | "removed"> {
      const poll = await this.getPoll(pollId);
      if (!poll) throw new Error("Poll not found");
      const mine = and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId), eq(pollVotes.optionIndex, optionIndex));
      return db.transaction(async (tx) => {
        const existing = await tx.select().from(pollVotes).where(mine).limit(1);
        if (existing.length > 0) {
          await tx.delete(pollVotes).where(mine);
          return "removed" as const;
        }
        if (!poll.multiple) {
          await tx.delete(pollVotes).where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
        }
        await tx.insert(pollVotes).values({ pollId, userId, optionIndex });
        return "added" as const;
      });
    },

    /** Aggregated vote counts for rendering. */
    async getPollTally(pollId: string): Promise<{ counts: number[]; totalVotes: number; voterCount: number }> {
      const poll = await this.getPoll(pollId);
      const rows = await db
        .select({ optionIndex: pollVotes.optionIndex, userId: pollVotes.userId })
        .from(pollVotes)
        .where(eq(pollVotes.pollId, pollId));
      const counts = new Array<number>(poll?.options.length ?? 0).fill(0);
      const voters = new Set<string>();
      for (const row of rows) {
        voters.add(row.userId);
        if (row.optionIndex >= 0 && row.optionIndex < counts.length) {
          counts[row.optionIndex] = (counts[row.optionIndex] ?? 0) + 1;
        }
      }
      return { counts, totalVotes: rows.length, voterCount: voters.size };
    },

    async closePoll(pollId: string): Promise<void> {
      await db.update(polls).set({ closed: true }).where(eq(polls.id, pollId));
    },

    /** Open (not closed) polls for a guild, newest first. */
    async listOpenPolls(guildId: string, limit = 10): Promise<Poll[]> {
      return db
        .select()
        .from(polls)
        .where(and(eq(polls.guildId, guildId), eq(polls.closed, false)))
        .orderBy(desc(polls.createdAt))
        .limit(Math.min(Math.max(limit, 1), 25));
    },
  };
}

export type Services = ReturnType<typeof createServices>;
