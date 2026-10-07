import { randomUUID } from "node:crypto";
import { and, desc, eq, isNotNull, isNull, lt, lte, ne, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { giveawayEntries, giveaways, guildSettings, guilds, modCases, pollVotes, polls, reminders, rolePanelEntries, rolePanels, scheduledTasks, tempRoles, type Giveaway, type GiveawayEntry, type ModCase, type Poll, type Reminder, type RolePanel, type RolePanelEntry, type ScheduledTask, type TempRole } from "./schema";

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

    /* ---------- reaction roles (self-assignable role panels) ---------- */

    async createRolePanel(input: {
      guildId: string;
      channelId: string;
      messageId: string;
      title: string;
      description?: string | null;
    }): Promise<RolePanel> {
      const [row] = await db
        .insert(rolePanels)
        .values({
          id: randomUUID(),
          guildId: input.guildId,
          channelId: input.channelId,
          messageId: input.messageId,
          title: input.title,
          description: input.description ?? null,
        })
        .returning();
      if (!row) throw new Error("Could not create role panel");
      return row;
    },

    async getRolePanel(panelId: string): Promise<RolePanel | null> {
      const rows = await db.select().from(rolePanels).where(eq(rolePanels.id, panelId)).limit(1);
      return rows[0] ?? null;
    },

    async getRolePanelByMessage(messageId: string): Promise<RolePanel | null> {
      const rows = await db.select().from(rolePanels).where(eq(rolePanels.messageId, messageId)).limit(1);
      return rows[0] ?? null;
    },

    /** Newest-first role panels for a guild. */
    async listRolePanels(guildId: string, limit = 10): Promise<RolePanel[]> {
      return db
        .select()
        .from(rolePanels)
        .where(eq(rolePanels.guildId, guildId))
        .orderBy(desc(rolePanels.createdAt))
        .limit(Math.min(Math.max(limit, 1), 25));
    },

    async getLatestRolePanel(guildId: string): Promise<RolePanel | null> {
      const rows = await this.listRolePanels(guildId, 1);
      return rows[0] ?? null;
    },

    /** Add (or update) a role option on a panel - idempotent per (panel, role). */
    async addRolePanelEntry(input: {
      panelId: string;
      roleId: string;
      emoji?: string | null;
      label: string;
    }): Promise<RolePanelEntry> {
      const [row] = await db
        .insert(rolePanelEntries)
        .values({
          id: randomUUID(),
          panelId: input.panelId,
          roleId: input.roleId,
          emoji: input.emoji ?? null,
          label: input.label,
        })
        .onConflictDoUpdate({
          target: [rolePanelEntries.panelId, rolePanelEntries.roleId],
          set: { emoji: input.emoji ?? null, label: input.label },
        })
        .returning();
      if (!row) throw new Error("Could not add role panel entry");
      return row;
    },

    async removeRolePanelEntry(panelId: string, roleId: string): Promise<boolean> {
      const rows = await db
        .delete(rolePanelEntries)
        .where(and(eq(rolePanelEntries.panelId, panelId), eq(rolePanelEntries.roleId, roleId)))
        .returning({ id: rolePanelEntries.id });
      return rows.length > 0;
    },

    /** Options of a panel in creation order (render + select ordering). */
    async listRolePanelEntries(panelId: string): Promise<RolePanelEntry[]> {
      return db
        .select()
        .from(rolePanelEntries)
        .where(eq(rolePanelEntries.panelId, panelId))
        .orderBy(rolePanelEntries.createdAt);
    },

    async countRolePanelEntries(panelId: string): Promise<number> {
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(rolePanelEntries)
        .where(eq(rolePanelEntries.panelId, panelId));
      return Number(rows[0]?.count ?? 0);
    },

    async deleteRolePanel(panelId: string): Promise<void> {
      await db.delete(rolePanels).where(eq(rolePanels.id, panelId));
    },

    /* ---------- reminders ---------- */

    async createReminder(input: {
      guildId: string;
      channelId: string;
      userId: string;
      message: string;
      remindAt: Date;
    }): Promise<Reminder> {
      const [row] = await db
        .insert(reminders)
        .values({ id: randomUUID(), ...input })
        .returning();
      if (!row) throw new Error("Could not create reminder");
      return row;
    },

    async getReminder(reminderId: string): Promise<Reminder | null> {
      const rows = await db.select().from(reminders).where(eq(reminders.id, reminderId)).limit(1);
      return rows[0] ?? null;
    },

    /** Unsent reminders whose time has come - oldest first (the bot's scan loop drains these). */
    async listDueReminders(limit = 25): Promise<Reminder[]> {
      return db
        .select()
        .from(reminders)
        .where(and(isNull(reminders.sentAt), lte(reminders.remindAt, new Date())))
        .orderBy(reminders.remindAt)
        .limit(Math.min(Math.max(limit, 1), 50));
    },

    async markReminderSent(reminderId: string): Promise<void> {
      await db.update(reminders).set({ sentAt: new Date() }).where(eq(reminders.id, reminderId));
    },

    /** A user's pending reminders in one guild, soonest first. */
    async listUserReminders(guildId: string, userId: string, limit = 10): Promise<Reminder[]> {
      return db
        .select()
        .from(reminders)
        .where(and(eq(reminders.guildId, guildId), eq(reminders.userId, userId), isNull(reminders.sentAt)))
        .orderBy(reminders.remindAt)
        .limit(Math.min(Math.max(limit, 1), 25));
    },

    async countUserReminders(guildId: string, userId: string): Promise<number> {
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reminders)
        .where(and(eq(reminders.guildId, guildId), eq(reminders.userId, userId), isNull(reminders.sentAt)));
      return Number(rows[0]?.count ?? 0);
    },

    /** Delete one pending reminder owned by the user; false when missing or not theirs. */
    async deleteUserReminder(reminderId: string, userId: string): Promise<boolean> {
      const rows = await db
        .delete(reminders)
        .where(and(eq(reminders.id, reminderId), eq(reminders.userId, userId), isNull(reminders.sentAt)))
        .returning({ id: reminders.id });
      return rows.length > 0;
    },

    /** Drop fired reminders older than N days so the table stays small. */
    async purgeSentReminders(olderThanDays = 30): Promise<number> {
      const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
      const rows = await db
        .delete(reminders)
        .where(and(isNotNull(reminders.sentAt), lt(reminders.sentAt, cutoff)))
        .returning({ id: reminders.id });
      return rows.length;
    },

    /* ---------- scheduler (durable timers) ---------- */

    async scheduleTask(input: {
      guildId?: string | null;
      kind: string;
      payload: Record<string, unknown>;
      runAt: Date;
    }): Promise<ScheduledTask> {
      const [row] = await db
        .insert(scheduledTasks)
        .values({
          id: randomUUID(),
          guildId: input.guildId ?? null,
          kind: input.kind,
          payload: input.payload,
          runAt: input.runAt,
        })
        .returning();
      if (!row) throw new Error("Could not schedule task");
      return row;
    },

    async getTask(taskId: string): Promise<ScheduledTask | null> {
      const rows = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, taskId)).limit(1);
      return rows[0] ?? null;
    },

    /** Pending tasks whose time has come - oldest first (the bot's scan drains these). */
    async listDueTasks(limit = 25): Promise<ScheduledTask[]> {
      return db
        .select()
        .from(scheduledTasks)
        .where(and(eq(scheduledTasks.status, "pending"), lte(scheduledTasks.runAt, new Date())))
        .orderBy(scheduledTasks.runAt)
        .limit(Math.min(Math.max(limit, 1), 50));
    },

    async markTaskDone(taskId: string): Promise<void> {
      await db.update(scheduledTasks).set({ status: "done", doneAt: new Date() }).where(eq(scheduledTasks.id, taskId));
    },

    async markTaskFailed(taskId: string, error: string): Promise<void> {
      await db
        .update(scheduledTasks)
        .set({ status: "failed", error: error.slice(0, 500), doneAt: new Date() })
        .where(eq(scheduledTasks.id, taskId));
    },

    /** Patch a task's payload (used when the id it references is created after it). */
    async setTaskPayload(taskId: string, payload: Record<string, unknown>): Promise<void> {
      await db.update(scheduledTasks).set({ payload }).where(eq(scheduledTasks.id, taskId));
    },

    /** Drop a still-pending task (its effect was cancelled). */
    async cancelTask(taskId: string): Promise<boolean> {
      const rows = await db
        .delete(scheduledTasks)
        .where(and(eq(scheduledTasks.id, taskId), eq(scheduledTasks.status, "pending")))
        .returning({ id: scheduledTasks.id });
      return rows.length > 0;
    },

    /** Drop finished tasks older than N days so the table stays small. */
    async purgeTasks(olderThanDays = 30): Promise<number> {
      const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
      const rows = await db
        .delete(scheduledTasks)
        .where(and(ne(scheduledTasks.status, "pending"), lt(scheduledTasks.doneAt, cutoff)))
        .returning({ id: scheduledTasks.id });
      return rows.length;
    },

    /* ---------- temp roles ---------- */

    async createTempRole(input: {
      guildId: string;
      userId: string;
      roleId: string;
      taskId: string;
      expiresAt: Date;
    }): Promise<TempRole> {
      const [row] = await db
        .insert(tempRoles)
        .values({ id: randomUUID(), ...input })
        .returning();
      if (!row) throw new Error("Could not create temp role");
      return row;
    },

    async getTempRole(tempRoleId: string): Promise<TempRole | null> {
      const rows = await db.select().from(tempRoles).where(eq(tempRoles.id, tempRoleId)).limit(1);
      return rows[0] ?? null;
    },

    /** Active temp roles in a guild, soonest expiry first; optionally for one member. */
    async listTempRoles(guildId: string, opts: { userId?: string; limit?: number } = {}): Promise<TempRole[]> {
      const where = opts.userId
        ? and(eq(tempRoles.guildId, guildId), eq(tempRoles.userId, opts.userId))
        : eq(tempRoles.guildId, guildId);
      return db
        .select()
        .from(tempRoles)
        .where(where)
        .orderBy(tempRoles.expiresAt)
        .limit(Math.min(Math.max(opts.limit ?? 25, 1), 50));
    },

    /** Remove a temp-role row; returns the removed row (or null). */
    async removeTempRole(tempRoleId: string): Promise<TempRole | null> {
      const rows = await db.delete(tempRoles).where(eq(tempRoles.id, tempRoleId)).returning();
      return rows[0] ?? null;
    },

    /* ---------- giveaways ---------- */

    async createGiveaway(input: {
      guildId: string;
      channelId: string;
      hostId: string;
      prize: string;
      winnerCount: number;
      endsAt: Date;
    }): Promise<Giveaway> {
      const [row] = await db
        .insert(giveaways)
        .values({ id: randomUUID(), ...input })
        .returning();
      if (!row) throw new Error("Could not create giveaway");
      return row;
    },

    async attachGiveawayMessage(giveawayId: string, messageId: string): Promise<void> {
      await db.update(giveaways).set({ messageId }).where(eq(giveaways.id, giveawayId));
    },

    async getGiveaway(giveawayId: string): Promise<Giveaway | null> {
      const rows = await db.select().from(giveaways).where(eq(giveaways.id, giveawayId)).limit(1);
      return rows[0] ?? null;
    },

    async getGiveawayByMessage(messageId: string): Promise<Giveaway | null> {
      const rows = await db.select().from(giveaways).where(eq(giveaways.messageId, messageId)).limit(1);
      return rows[0] ?? null;
    },

    /** Guild giveaways, newest first; openOnly filters to running ones. */
    async listGiveaways(guildId: string, opts: { openOnly?: boolean; limit?: number } = {}): Promise<Giveaway[]> {
      const where = opts.openOnly
        ? and(eq(giveaways.guildId, guildId), eq(giveaways.ended, false))
        : eq(giveaways.guildId, guildId);
      return db
        .select()
        .from(giveaways)
        .where(where)
        .orderBy(desc(giveaways.createdAt))
        .limit(Math.min(Math.max(opts.limit ?? 10, 1), 25));
    },

    /** Toggle an entry; throws when the giveaway is missing or already ended. */
    async toggleGiveawayEntry(giveawayId: string, userId: string): Promise<"entered" | "left"> {
      return db.transaction(async (tx) => {
        const rows = await tx.select().from(giveaways).where(eq(giveaways.id, giveawayId)).limit(1);
        const giveaway = rows[0];
        if (!giveaway) throw new Error("Giveaway not found");
        if (giveaway.ended) throw new Error("Giveaway already ended");
        const mine = and(eq(giveawayEntries.giveawayId, giveawayId), eq(giveawayEntries.userId, userId));
        const existing = await tx.select().from(giveawayEntries).where(mine).limit(1);
        if (existing.length > 0) {
          await tx.delete(giveawayEntries).where(mine);
          return "left" as const;
        }
        await tx.insert(giveawayEntries).values({ giveawayId, userId });
        return "entered" as const;
      });
    },

    async countGiveawayEntries(giveawayId: string): Promise<number> {
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(giveawayEntries)
        .where(eq(giveawayEntries.giveawayId, giveawayId));
      return Number(rows[0]?.count ?? 0);
    },

    async listGiveawayEntries(giveawayId: string): Promise<GiveawayEntry[]> {
      return db.select().from(giveawayEntries).where(eq(giveawayEntries.giveawayId, giveawayId));
    },

    /** Freeze winners - only when still open; null when it was already ended. */
    async finishGiveaway(giveawayId: string, winners: string[]): Promise<Giveaway | null> {
      const rows = await db
        .update(giveaways)
        .set({ ended: true, winners })
        .where(and(eq(giveaways.id, giveawayId), eq(giveaways.ended, false)))
        .returning();
      return rows[0] ?? null;
    },

    /** Replace the winners of an ended giveaway (reroll). */
    async setGiveawayWinners(giveawayId: string, winners: string[]): Promise<Giveaway | null> {
      const rows = await db.update(giveaways).set({ winners }).where(eq(giveaways.id, giveawayId)).returning();
      return rows[0] ?? null;
    },
  };
}

export type Services = ReturnType<typeof createServices>;
