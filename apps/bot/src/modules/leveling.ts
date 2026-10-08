import { randomInt } from "node:crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type Guild,
  type GuildMember,
  type Message,
} from "discord.js";
import { defineModule, type ModuleContext } from "@mem/core";
import { levelFromXp, progressFromXp } from "@mem/db";
import { COLORS, embed, type EmbedBuilder } from "../lib/embed";
import { ensureGuild, ephemeral, requirePermissions, UserError } from "../lib/permissions";
import { services } from "../lib/services";

type LevelingConfig = {
  /** XP gain toggle (default on). */
  enabled?: boolean;
  /** Level-up announcements channel. */
  announceChannelId?: string | null;
  /** Role rewards: grant `roleId` when the member reaches `level` (cumulative). */
  levelRoles?: Array<{ level: number; roleId: string }>;
  /** Per-server XP tuning (all optional — defaults apply). */
  xpMin?: number;
  xpMax?: number;
  cooldownSec?: number;
};

const DEFAULT_XP_MIN = 15;
const DEFAULT_XP_MAX = 25;
const DEFAULT_XP_COOLDOWN_SEC = 60;
const PAGE_SIZE = 10;
const MAX_PAGE = 25;
const COOLDOWN_CAP = 5_000;

const FILLED = "▰";
const EMPTY = "▱";
const fmt = (n: number): string => n.toLocaleString("en-US");

/** Bounded in-memory XP cooldowns: `${guildId}:${userId}` -> last grant (ms). */
const lastGrant = new Map<string, number>();

const clampNum = (n: number, lo: number, hi: number): number => Math.min(Math.max(Math.trunc(n), lo), hi);

/** Per-server XP settings (defaults apply when unset — every number is overridable). */
function xpSettings(cfg: LevelingConfig | null): { min: number; max: number; cooldownSec: number; cooldownMs: number } {
  const min = clampNum(cfg?.xpMin ?? DEFAULT_XP_MIN, 1, 100);
  const max = Math.max(clampNum(cfg?.xpMax ?? DEFAULT_XP_MAX, 1, 200), min);
  const cooldownSec = clampNum(cfg?.cooldownSec ?? DEFAULT_XP_COOLDOWN_SEC, 5, 3600);
  return { min, max, cooldownSec, cooldownMs: cooldownSec * 1000 };
}

function onCooldown(guildId: string, userId: string, cooldownMs: number): boolean {
  const key = `${guildId}:${userId}`;
  const now = Date.now();
  const last = lastGrant.get(key);
  if (last !== undefined && now - last < cooldownMs) return true;
  lastGrant.set(key, now);
  if (lastGrant.size > COOLDOWN_CAP) {
    let drop = 500;
    for (const k of lastGrant.keys()) {
      lastGrant.delete(k);
      if (--drop <= 0) break;
    }
  }
  return false;
}

function progressBar(ratio: number, size = 12): string {
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * size);
  return FILLED.repeat(filled) + EMPTY.repeat(size - filled);
}

/** Grants role rewards + sends the announcement; never throws. */
async function announceLevelUp(
  ctx: ModuleContext,
  guild: Guild,
  userId: string,
  level: number,
  cfg: LevelingConfig | null,
): Promise<void> {
  const rewards = (cfg?.levelRoles ?? []).filter((r) => r.level <= level);
  if (rewards.length > 0) {
    const member: GuildMember | null = await guild.members.fetch(userId).catch(() => null);
    if (member) {
      for (const reward of rewards) {
        if (!member.roles.cache.has(reward.roleId)) {
          await member.roles.add(reward.roleId, `Level ${reward.level} reward`).catch(() => undefined);
        }
      }
    }
  }

  const channelId = cfg?.announceChannelId;
  if (!channelId) return;
  const channel = await ctx.client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isSendable()) return;
  await channel
    .send({
      embeds: [
        embed({
          color: COLORS.brand,
          title: "🎉 Level up!",
          description: `<@${userId}> just reached **level ${level}**!`,
        }),
      ],
      allowedMentions: { users: [userId] },
    })
    .catch(() => undefined);
}

async function buildLeaderboard(guildId: string, page: number) {
  const total = await services.countRanked(guildId);
  const pages = Math.max(1, Math.min(MAX_PAGE, Math.ceil(total / PAGE_SIZE)));
  const current = Math.max(1, Math.min(pages, page));
  const rows = await services.getTopLevels(guildId, PAGE_SIZE, (current - 1) * PAGE_SIZE);

  const medals = ["🥇", "🥈", "🥉"];
  const lines = rows.length
    ? rows.map((row, idx) => {
        const place = (current - 1) * PAGE_SIZE + idx + 1;
        const badge = place <= 3 ? medals[place - 1] : `**#${place}**`;
        return `${badge} <@${row.userId}> — level **${levelFromXp(row.xp)}** · ${fmt(row.xp)} XP`;
      })
    : ["*No XP yet — start chatting to appear here!*"];

  const board: EmbedBuilder = embed({ color: COLORS.brand, title: "🏆 Leaderboard", description: lines.join("\n") }).setFooter({
    text: `Page ${current} / ${pages} · ${fmt(total)} ranked member${total === 1 ? "" : "s"}`,
  });

  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb:${current - 1}`)
      .setLabel("← Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current <= 1),
    new ButtonBuilder()
      .setCustomId(`lb:${current + 1}`)
      .setLabel("Next →")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current >= pages),
  );

  return { embeds: [board], components: pages > 1 ? [nav] : [] };
}

export const levelingModule = defineModule({
  id: "leveling",
  name: "Leveling",
  version: "0.1.0",
  events: [
    {
      name: "messageCreate",
      async execute(message: Message, ctx: ModuleContext) {
        if (!message.inGuild() || message.author.bot) return;

        const cfg = await services
          .getModuleConfig<LevelingConfig>(message.guild.id, "leveling")
          .catch(() => null);
        if (cfg?.enabled === false) return;

        const xp = xpSettings(cfg);
        if (onCooldown(message.guild.id, message.author.id, xp.cooldownMs)) return;

        const amount = randomInt(xp.min, xp.max + 1);
        const result = await services
          .grantXp(message.guild.id, message.author.id, amount)
          .catch(() => null);
        if (!result) return;
        if (result.level > result.previousLevel) {
          void announceLevelUp(ctx, message.guild, message.author.id, result.level, cfg).catch(() => undefined);
        }
      },
    },
  ],
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("Show a member's level, XP and leaderboard position.")
        .addUserOption((o) => o.setName("user").setDescription("Member (defaults to you)")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const target = i.options.getUser("user") ?? i.user;
        const lvlCfg = await services.getModuleConfig<LevelingConfig>(i.guild.id, "leveling").catch(() => null);
        const xpCfg = xpSettings(lvlCfg);
        const [row, rank, ranked] = await Promise.all([
          services.getMemberLevel(i.guild.id, target.id),
          services.getRank(i.guild.id, target.id),
          services.countRanked(i.guild.id),
        ]);
        const xp = row?.xp ?? 0;
        const { level, into, need, ratio } = progressFromXp(xp);
        const card = embed({ color: COLORS.brand })
          .setAuthor({ name: target.username, iconURL: target.displayAvatarURL({ size: 128 }) })
          .setTitle(`Level ${level}`)
          .setDescription(
            [
              `\`${progressBar(ratio)}\``,
              `**${fmt(into)} / ${fmt(need)} XP** to next level`,
              xp > 0
                ? `Total **${fmt(xp)} XP** · Rank **#${rank}** of ${fmt(ranked)}`
                : "Total **0 XP** · unranked — chat to join the board!",
            ].join("\n"),
          )
          .setFooter({ text: `Chat to earn XP · one grant per ${xpCfg.cooldownSec}s` });
        await i.reply({ embeds: [card] });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Top members by XP.")
        .addIntegerOption((o) =>
          o.setName("page").setDescription("Page number").setMinValue(1).setMaxValue(MAX_PAGE),
        ),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const view = await buildLeaderboard(i.guild.id, i.options.getInteger("page") ?? 1);
        await i.reply(view);
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("levels")
        .setDescription("Leveling settings: announcements, role rewards, on/off.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) =>
          s
            .setName("channel")
            .setDescription("Set (or clear) the level-up announcement channel")
            .addChannelOption((o) =>
              o.setName("channel").setDescription("Announcement channel (omit to clear)"),
            ),
        )
        .addSubcommand((s) => s.setName("toggle").setDescription("Turn XP gain on or off"))
        .addSubcommand((s) =>
          s
            .setName("addrole")
            .setDescription("Add a role reward")
            .addIntegerOption((o) =>
              o.setName("level").setDescription("Level required").setRequired(true).setMinValue(1).setMaxValue(500),
            )
            .addRoleOption((o) => o.setName("role").setDescription("Role to grant at that level").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("removerole")
            .setDescription("Remove a role reward")
            .addIntegerOption((o) =>
              o.setName("level").setDescription("Level whose reward to remove").setRequired(true).setMinValue(1).setMaxValue(500),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("xp")
            .setDescription("Tune XP gain — your own numbers")
            .addIntegerOption((o) => o.setName("min").setDescription("Minimum XP per message (1-100)").setMinValue(1).setMaxValue(100))
            .addIntegerOption((o) => o.setName("max").setDescription("Maximum XP per message (1-200)").setMinValue(1).setMaxValue(200))
            .addIntegerOption((o) => o.setName("cooldown_seconds").setDescription("Seconds between XP grants (5-3600)").setMinValue(5).setMaxValue(3600)),
        )
        .addSubcommand((s) => s.setName("config").setDescription("Show the current leveling settings")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
        const sub = i.options.getSubcommand();
        const cfg = (await services.getModuleConfig<LevelingConfig>(i.guild.id, "leveling")) ?? {};

        if (sub === "channel") {
          const channel = i.options.getChannel("channel");
          cfg.announceChannelId = channel?.id ?? null;
          await services.setModuleConfig(i.guild.id, "leveling", cfg);
          await i.reply(
            ephemeral(channel ? `Level-up announcements will go to <#${channel.id}>.` : "Level-up announcements disabled."),
          );
          return;
        }
        if (sub === "toggle") {
          const currentlyOn = cfg.enabled !== false;
          cfg.enabled = !currentlyOn;
          await services.setModuleConfig(i.guild.id, "leveling", cfg);
          await i.reply(ephemeral(`XP gain is now **${cfg.enabled ? "ON" : "OFF"}**.`));
          return;
        }
        if (sub === "addrole") {
          const level = i.options.getInteger("level", true);
          const role = i.options.getRole("role", true);
          if (role.id === i.guild.id) throw new UserError("You can't use @everyone as a reward.");
          if (role.managed) throw new UserError("That role is managed by an integration and can't be a reward.");
          const next = (cfg.levelRoles ?? []).filter((r) => r.level !== level);
          next.push({ level, roleId: role.id });
          next.sort((a, b) => a.level - b.level);
          cfg.levelRoles = next;
          await services.setModuleConfig(i.guild.id, "leveling", cfg);
          await i.reply(ephemeral(`<@&${role.id}> will be granted at **level ${level}**.`));
          return;
        }
        if (sub === "removerole") {
          const level = i.options.getInteger("level", true);
          const roles = cfg.levelRoles ?? [];
          const next = roles.filter((r) => r.level !== level);
          if (next.length === roles.length) throw new UserError(`There is no role reward at level ${level}.`);
          cfg.levelRoles = next;
          await services.setModuleConfig(i.guild.id, "leveling", cfg);
          await i.reply(ephemeral(`Removed the level ${level} role reward.`));
          return;
        }

        if (sub === "xp") {
          const cur = xpSettings(cfg);
          const min = i.options.getInteger("min") ?? cur.min;
          const max = i.options.getInteger("max") ?? cur.max;
          if (min > max) throw new UserError("Minimum XP can't be higher than maximum.");
          const cooldownSec = i.options.getInteger("cooldown_seconds") ?? cur.cooldownSec;
          cfg.xpMin = min;
          cfg.xpMax = max;
          cfg.cooldownSec = cooldownSec;
          await services.setModuleConfig(i.guild.id, "leveling", cfg);
          await i.reply(ephemeral(`XP settings: **${min}–${max} XP per message**, once every **${cooldownSec}s**.`));
          return;
        }

        const rewardLines =
          cfg.levelRoles && cfg.levelRoles.length > 0
            ? cfg.levelRoles.map((r) => `- Level **${r.level}** → <@&${r.roleId}>`).join("\n")
            : "*none yet — add one with `/levels addrole`*";
        const panel = embed({ color: COLORS.brand, title: "⚙️ Leveling settings" })
          .setDescription(
            [
              `Status: **${cfg.enabled === false ? "OFF" : "ON"}**`,
              `Announce channel: ${cfg.announceChannelId ? `<#${cfg.announceChannelId}>` : "*off*"}`,
              `Role rewards:\n${rewardLines}`,
              "",
              `Members earn **${xpSettings(cfg).min}–${xpSettings(cfg).max} XP per message**, once every **${xpSettings(cfg).cooldownSec}s**, on the \`5L² + 50L + 100\` curve. Tune with /levels xp.`,
            ].join("\n"),
          )
          .setFooter({ text: "Level commands: /rank · /leaderboard" });
        await i.reply({ embeds: [panel], flags: MessageFlags.Ephemeral });
      },
    },
  ],
  components: [
    {
      customIdPrefix: "lb:",
      async execute(interaction) {
        if (!interaction.isButton()) return;
        const guildId = interaction.guildId;
        if (!guildId) {
          await interaction.deferUpdate().catch(() => undefined);
          return;
        }
        const page = Number.parseInt(interaction.customId.split(":")[1] ?? "1", 10);
        const view = await buildLeaderboard(guildId, Number.isFinite(page) ? page : 1);
        await interaction.update(view).catch(() => undefined);
      },
    },
  ],
});
