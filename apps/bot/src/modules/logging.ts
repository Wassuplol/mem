import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildBan,
  type GuildMember,
  type Message,
  type PartialGuildMember,
  type PartialMessage,
} from "discord.js";
import { defineModule, type ModuleContext } from "@mem/core";
import { COLORS, embed, type EmbedBuilder } from "../lib/embed";
import { ensureGuild, requirePermissions } from "../lib/permissions";
import { config } from "../lib/config";
import { services } from "../lib/services";

type LoggingConfig = { channelId?: string };

async function sendLogEmbed(ctx: ModuleContext, channelId: string, builder: EmbedBuilder): Promise<void> {
  const channel = await ctx.client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isSendable()) return;
  await channel.send({ embeds: [builder] }).catch(() => undefined);
}

async function getConfig(guildId: string): Promise<LoggingConfig | null> {
  return services.getModuleConfig<LoggingConfig>(guildId, "logging");
}

export const loggingModule = defineModule({
  id: "logging",
  name: "Logging",
  version: "0.0.1",
  events: [
    {
      name: "guildBanAdd",
      async execute(ban: GuildBan, ctx: ModuleContext) {
        const cfg = await getConfig(ban.guild.id);
        if (!cfg?.channelId) return;
        await sendLogEmbed(
          ctx,
          cfg.channelId,
          embed({
            color: COLORS.error,
            title: "Member banned",
            description: `**${ban.user.tag}** (\`${ban.user.id}\`)\n**Reason:** ${ban.reason ?? "No reason provided"}`,
          }),
        );
      },
    },
    {
      name: "guildBanRemove",
      async execute(ban: GuildBan, ctx: ModuleContext) {
        const cfg = await getConfig(ban.guild.id);
        if (!cfg?.channelId) return;
        await sendLogEmbed(
          ctx,
          cfg.channelId,
          embed({
            color: COLORS.success,
            title: "Member unbanned",
            description: `**${ban.user.tag}** (\`${ban.user.id}\`)`,
          }),
        );
      },
    },
    {
      name: "messageDelete",
      async execute(message: Message | PartialMessage, ctx: ModuleContext) {
        if (!message.guildId || message.author?.bot) return;
        const cfg = await getConfig(message.guildId);
        if (!cfg?.channelId || message.channelId === cfg.channelId) return;
        const author = message.author ? `${message.author.username} (\`${message.author.id}\`)` : "unknown (not cached)";
        const preview = message.content ? `\n> ${message.content.slice(0, 400).replace(/\n/g, "\n> ")}` : "";
        await sendLogEmbed(
          ctx,
          cfg.channelId,
          embed({
            color: COLORS.neutral,
            title: "Message deleted",
            description: `In <#${message.channelId}> by **${author}**${preview}`,
          }),
        );
      },
    },
    {
      name: "guildMemberAdd",
      async execute(member: GuildMember, ctx: ModuleContext) {
        const cfg = await getConfig(member.guild.id);
        if (!cfg?.channelId) return;
        const ageDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
        await sendLogEmbed(
          ctx,
          cfg.channelId,
          embed({
            color: COLORS.success,
            title: "Member joined",
            description: `${member.user} (${member.user.tag}) - account is **${ageDays}d** old (<t:${Math.floor(
              member.user.createdTimestamp / 1000,
            )}:R>)`,
          }),
        );
      },
    },
    {
      name: "guildMemberRemove",
      async execute(member: GuildMember | PartialGuildMember, ctx: ModuleContext) {
        const cfg = await getConfig(member.guild.id);
        if (!cfg?.channelId) return;
        const who = member.user ? `${member.user.tag} (\`${member.id}\`)` : `\`${member.id}\``;
        const joined = member.joinedAt ? ` (joined <t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>)` : "";
        await sendLogEmbed(
          ctx,
          cfg.channelId,
          embed({ color: COLORS.warn, title: "Member left", description: `**${who}**${joined}` }),
        );
      },
    },
  ],
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("logchannel")
        .setDescription("Configure where Mem posts server event logs.")
        .addSubcommand((s) =>
          s
            .setName("set")
            .setDescription("Set the log channel")
            .addChannelOption((o) => o.setName("channel").setDescription("Log channel").setRequired(true)),
        )
        .addSubcommand((s) => s.setName("off").setDescription("Disable logging"))
        .addSubcommand((s) => s.setName("status").setDescription("Show current logging config")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
        const sub = i.options.getSubcommand(true);

        if (sub === "set") {
          const channel = i.options.getChannel("channel", true);
          if (!channel.isTextBased()) {
            await i.reply({ content: "That is not a text channel.", flags: 64 });
            return;
          }
          await services.setModuleConfig(i.guild.id, "logging", { channelId: channel.id });
          const suffix = config.membersIntent
            ? ""
            : "\n\n*Tip: member join/leave logs need the Server Members intent - set `ENABLE_MEMBERS_INTENT=1` in `.env` and enable it in the Dev Portal.*";
          await i.reply({
            embeds: [
              embed({
                color: COLORS.success,
                description: `Logging enabled - events will be posted in <#${channel.id}>.\nLogging: bans, unbans, message deletes, member join/leave.${suffix}`,
              }),
            ],
          });
          return;
        }

        if (sub === "off") {
          await services.setModuleConfig(i.guild.id, "logging", {});
          await i.reply({ embeds: [embed({ color: COLORS.neutral, description: "Logging disabled." })] });
          return;
        }

        const cfg = await getConfig(i.guild.id);
        await i.reply({
          embeds: [
            embed({
              color: COLORS.brand,
              title: "Logging config",
              description: cfg?.channelId ? `Log channel: <#${cfg.channelId}>` : "Not configured. Use `/logchannel set`.",
            }),
          ],
        });
      },
    },
  ],
});
