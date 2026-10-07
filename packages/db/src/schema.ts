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

export * from "./schema/auth";
