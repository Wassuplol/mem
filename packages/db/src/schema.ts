import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/** Discord guilds Mem has seen. */
export const guilds = pgTable("guilds", {
  id: text("id").primaryKey(), // Discord snowflake
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Per-guild, per-module configuration blobs (validated by each module). */
export const guildSettings = pgTable(
  "guild_settings",
  {
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    moduleId: text("module_id").notNull(),
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.moduleId] })],
);

/** Moderation cases: one row per action (warn, timeout, kick, ban, unban, note...). */
export const modCases = pgTable(
  "mod_cases",
  {
    id: text("id").primaryKey(), // uuid
    guildId: text("guild_id").notNull(),
    caseNumber: integer("case_number").notNull(),
    action: text("action").notNull(),
    targetId: text("target_id").notNull(),
    moderatorId: text("moderator_id").notNull(),
    reason: text("reason"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("mod_cases_guild_number_idx").on(t.guildId, t.caseNumber),
    index("mod_cases_guild_target_idx").on(t.guildId, t.targetId),
  ],
);

export type ModCase = typeof modCases.$inferSelect;

/** Polls: message-attached polls with live result edits. */
export const polls = pgTable(
  "polls",
  {
    id: text("id").primaryKey(), // uuid
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id"),
    messageId: text("message_id"),
    authorId: text("author_id").notNull(),
    question: text("question").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    multiple: boolean("multiple").notNull().default(false),
    closed: boolean("closed").notNull().default(false),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("polls_guild_idx").on(t.guildId), index("polls_message_idx").on(t.messageId)],
);

export type Poll = typeof polls.$inferSelect;

/** One row per (poll, user, option). Single-choice polls replace prior rows on vote. */
export const pollVotes = pgTable(
  "poll_votes",
  {
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    optionIndex: integer("option_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.userId, t.optionIndex] })],
);

export type PollVote = typeof pollVotes.$inferSelect;

/** Reaction-role panels: a message carrying a select menu for self-assignable roles. */
export const rolePanels = pgTable(
  "role_panels",
  {
    id: text("id").primaryKey(), // uuid
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("role_panels_guild_idx").on(t.guildId), uniqueIndex("role_panels_message_idx").on(t.messageId)],
);

export type RolePanel = typeof rolePanels.$inferSelect;

/** Select-menu option for a panel: one row per (panel, role). Toggling grants/removes the role. */
export const rolePanelEntries = pgTable(
  "role_panel_entries",
  {
    id: text("id").primaryKey(), // uuid
    panelId: text("panel_id")
      .notNull()
      .references(() => rolePanels.id, { onDelete: "cascade" }),
    roleId: text("role_id").notNull(),
    emoji: text("emoji"),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("role_panel_entries_panel_role_idx").on(t.panelId, t.roleId)],
);

export type RolePanelEntry = typeof rolePanelEntries.$inferSelect;

/** Reminders: Mem pings the user at a wall-clock time (delivered by the bot's scan loop). */
export const reminders = pgTable(
  "reminders",
  {
    id: text("id").primaryKey(), // uuid
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    userId: text("user_id").notNull(),
    message: text("message").notNull(),
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("reminders_due_idx").on(t.sentAt, t.remindAt), index("reminders_user_idx").on(t.guildId, t.userId)],
);

export type Reminder = typeof reminders.$inferSelect;

/** Generic durable tasks (tempban unbans, temp-role removals, giveaway ends...). */
export const scheduledTasks = pgTable(
  "scheduled_tasks",
  {
    id: text("id").primaryKey(), // uuid
    guildId: text("guild_id"),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"), // pending | done | failed
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    doneAt: timestamp("done_at", { withTimezone: true }),
  },
  (t) => [index("scheduled_tasks_due_idx").on(t.status, t.runAt)],
);

export type ScheduledTask = typeof scheduledTasks.$inferSelect;

/** Temp roles: granted now, removed by a scheduled task at expiry. */
export const tempRoles = pgTable(
  "temp_roles",
  {
    id: text("id").primaryKey(), // uuid
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    roleId: text("role_id").notNull(),
    taskId: text("task_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("temp_roles_guild_user_idx").on(t.guildId, t.userId)],
);

export type TempRole = typeof tempRoles.$inferSelect;

/** Giveaways: one row per giveaway card message. */
export const giveaways = pgTable(
  "giveaways",
  {
    id: text("id").primaryKey(), // uuid
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    hostId: text("host_id").notNull(),
    prize: text("prize").notNull(),
    winnerCount: integer("winner_count").notNull().default(1),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    ended: boolean("ended").notNull().default(false),
    winners: jsonb("winners").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("giveaways_guild_idx").on(t.guildId), index("giveaways_message_idx").on(t.messageId)],
);

export type Giveaway = typeof giveaways.$inferSelect;

/** One row per (giveaway, user); clicking the button toggles it. */
export const giveawayEntries = pgTable(
  "giveaway_entries",
  {
    giveawayId: text("giveaway_id")
      .notNull()
      .references(() => giveaways.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.giveawayId, t.userId] })],
);

export type GiveawayEntry = typeof giveawayEntries.$inferSelect;

/** Public API keys for /api/v1 (stored as SHA-256 hashes; the raw key is shown once). */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(), // uuid
    guildId: text("guild_id").notNull(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("api_keys_hash_idx").on(t.keyHash), index("api_keys_guild_idx").on(t.guildId)],
);

export type ApiKey = typeof apiKeys.$inferSelect;

/** Chat XP per member (one row per guild+user; level is derived from xp). */
export const levels = pgTable(
  "levels",
  {
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    xp: integer("xp").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.userId] }), index("levels_guild_xp_idx").on(t.guildId, t.xp)],
);

export type Level = typeof levels.$inferSelect;

/** Support tickets: one row per ticket thread (status open|closed). */
export const tickets = pgTable(
  "tickets",
  {
    id: text("id").primaryKey(), // uuid
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(), // thread id
    messageId: text("message_id"), // intro message in the thread
    userId: text("user_id").notNull(), // opener
    status: text("status").notNull().default("open"), // open | closed
    claimedBy: text("claimed_by"),
    closeReason: text("close_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    index("tickets_guild_status_idx").on(t.guildId, t.status),
    uniqueIndex("tickets_channel_idx").on(t.channelId),
  ],
);

export type Ticket = typeof tickets.$inferSelect;

/** Private staff notes about members (never shown to the target). */
export const modNotes = pgTable(
  "mod_notes",
  {
    id: text("id").primaryKey(), // uuid
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    authorId: text("author_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("mod_notes_guild_user_idx").on(t.guildId, t.userId)],
);

export type ModNote = typeof modNotes.$inferSelect;

export * from "./schema/auth";
