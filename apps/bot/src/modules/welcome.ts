import { PermissionFlagsBits, SlashCommandBuilder, type EmbedBuilder, type GuildMember } from "discord.js";
import { defineModule, type ModuleContext } from "@mem/core";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild, requirePermissions } from "../lib/permissions";
import { config } from "../lib/config";
import { services } from "../lib/services";

type WelcomeConfig = { channelId?: string; message?: string };

/** Top-tier default template. Placeholders: {user} {server} {count} */
const DEFAULT_MESSAGE =
  "**{user}**, you are member **#{count}**! 🎉\n\nGrab your roles, introduce yourself, and make yourself at home. 💜";

function render(template: string, member: GuildMember): string {
  return template
    .replaceAll("{user}", member.displayName)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{count}", `${member.guild.memberCount}`);
}

/** Minimal structural type: anything with a compatible send(). */
type WelcomeChannel = {
  send: (options: {
    content: string;
    embeds: EmbedBuilder[];
    allowedMentions: { users: string[] };
  }) => Promise<unknown>;
};

/** Shared sender: branded welcome card + a real ping so the member gets notified. */
async function sendWelcome(channel: WelcomeChannel, member: GuildMember, template: string): Promise<void> {
  await channel.send({
    content: `<@${member.id}>`,
    embeds: [
      embed({
        color: COLORS.brand,
        title: `🎉 Welcome to ${member.guild.name}!`,
        description: render(template, member),
      })
        .setThumbnail(member.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `${member.guild.name} · member #${member.guild.memberCount}` }),
    ],
    allowedMentions: { users: [member.id] },
  });
}

export const welcomeModule = defineModule({
  id: "welcome",
  name: "Welcome",
  version: "0.1.0",
  events: [
    {
      name: "guildMemberAdd",
      async execute(member: GuildMember, ctx: ModuleContext) {
        if (member.user.bot) return;
        const cfg = await services.getModuleConfig<WelcomeConfig>(member.guild.id, "welcome");
        if (!cfg?.channelId) return;
        const channel = await ctx.client.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel || !channel.isSendable()) return;
        await sendWelcome(channel, member, cfg.message ?? DEFAULT_MESSAGE).catch(() => undefined);
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
            .setDescription("Set the welcome channel and card text")
            .addChannelOption((o) => o.setName("channel").setDescription("Welcome channel").setRequired(true))
            .addStringOption((o) =>
              o
                .setName("message")
                .setDescription("Template - {user} {server} {count} (default: the fancy one)")
                .setMaxLength(1500),
            ),
        )
        .addSubcommand((s) => s.setName("off").setDescription("Disable welcome messages"))
        .addSubcommand((s) => s.setName("test").setDescription("Send a test welcome card (preview)")),
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
                description: `Welcome cards enabled in <#${channel.id}>.\nTemplate: ${message}`,
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

        // test
        const cfg = await services.getModuleConfig<WelcomeConfig>(i.guild.id, "welcome");
        if (!cfg?.channelId) {
          await i.reply({ content: "Welcome is not configured yet - use `/welcome set <channel>` first.", flags: 64 });
          return;
        }
        const channel = await i.client.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel || !channel.isSendable() || !channel.isTextBased()) {
          await i.reply({ content: "The configured welcome channel is missing or not sendable.", flags: 64 });
          return;
        }
        await sendWelcome(channel, i.member, cfg.message ?? DEFAULT_MESSAGE);
        await i.reply({ content: `Test welcome card sent to <#${channel.id}> - that is exactly what a new member sees. ✨`, flags: 64 });
      },
    },
  ],
});
