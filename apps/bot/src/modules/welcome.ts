import { PermissionFlagsBits, SlashCommandBuilder, type GuildMember } from "discord.js";
import { defineModule, type ModuleContext } from "@mem/core";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild, requirePermissions } from "../lib/permissions";
import { config } from "../lib/config";
import { services } from "../lib/services";

type WelcomeConfig = { channelId?: string; message?: string };

const DEFAULT_MESSAGE = "Welcome {user} to **{server}**! You are member #{count}. 🎉";

function render(template: string, member: GuildMember): string {
  return template
    .replaceAll("{user}", `${member}`)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{count}", `${member.guild.memberCount}`);
}

export const welcomeModule = defineModule({
  id: "welcome",
  name: "Welcome",
  version: "0.0.1",
  events: [
    {
      name: "guildMemberAdd",
      async execute(member: GuildMember, ctx: ModuleContext) {
        if (member.user.bot) return;
        const cfg = await services.getModuleConfig<WelcomeConfig>(member.guild.id, "welcome");
        if (!cfg?.channelId) return;
        const channel = await ctx.client.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel || !channel.isSendable()) return;
        await channel.send({ content: render(cfg.message ?? DEFAULT_MESSAGE, member) }).catch(() => undefined);
      },
    },
  ],
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("welcome")
        .setDescription("Welcome messages for new members.")
        .addSubcommand((s) =>
          s
            .setName("set")
            .setDescription("Set the welcome channel and message")
            .addChannelOption((o) => o.setName("channel").setDescription("Welcome channel").setRequired(true))
            .addStringOption((o) =>
              o
                .setName("message")
                .setDescription("Template - {user} {server} {count}")
                .setMaxLength(1500),
            ),
        )
        .addSubcommand((s) => s.setName("off").setDescription("Disable welcome messages"))
        .addSubcommand((s) => s.setName("test").setDescription("Send a test welcome message")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
        const sub = i.options.getSubcommand(true);

        if (sub === "set") {
          if (!config.membersIntent) {
            await i.reply({
              content:
                "The Server Members intent is off, so Mem cannot see joins yet. Set `ENABLE_MEMBERS_INTENT=1` in `.env`, enable \"Server Members Intent\" in the Discord Dev Portal, and restart the bot.",
              flags: 64,
            });
            return;
          }
          const channel = i.options.getChannel("channel", true);
          if (!channel.isTextBased()) {
            await i.reply({ content: "That is not a text channel.", flags: 64 });
            return;
          }
          const message = i.options.getString("message") ?? DEFAULT_MESSAGE;
          await services.setModuleConfig(i.guild.id, "welcome", { channelId: channel.id, message });
          await i.reply({
            embeds: [
              embed({
                color: COLORS.success,
                description: `Welcome messages enabled in <#${channel.id}>.\nTemplate: ${message}`,
              }),
            ],
          });
          return;
        }

        if (sub === "off") {
          await services.setModuleConfig(i.guild.id, "welcome", {});
          await i.reply({ embeds: [embed({ color: COLORS.neutral, description: "Welcome messages disabled." })] });
          return;
        }

        const cfg = await services.getModuleConfig<WelcomeConfig>(i.guild.id, "welcome");
        if (!cfg?.channelId) {
          await i.reply({ content: "Welcome is not configured yet - use `/welcome set` first.", flags: 64 });
          return;
        }
        const channel = await i.client.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel || !channel.isSendable()) {
          await i.reply({ content: "The configured welcome channel is missing or not sendable.", flags: 64 });
          return;
        }
        await channel.send({ content: render(cfg.message ?? DEFAULT_MESSAGE, i.member) });
        await i.reply({ content: `Test welcome sent to <#${cfg.channelId}>.`, flags: 64 });
      },
    },
  ],
});
