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

export * from "./schema/auth";
