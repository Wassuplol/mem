import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { defineModule } from "@mem/core";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild, requirePermissions } from "../lib/permissions";
import { services } from "../lib/services";

type Cached = ChatInputCommandInteraction<"cached">;

/** Shared by /timeout and /mute. */
async function applyTimeout(i: Cached): Promise<void> {
  const member = i.options.getMember("user");
  if (!member) {
    await i.reply({ content: "That user is not a member of this server.", flags: 64 });
    return;
  }
  const minutes = i.options.getInteger("minutes", true);
  const reason = i.options.getString("reason") ?? "No reason provided";
  await member.timeout(minutes * 60_000, reason);
  const record = await services.createCase({
    guildId: i.guild.id,
    action: "timeout",
    targetId: member.id,
    moderatorId: i.user.id,
    reason,
  });
  await i.reply({
    embeds: [
      embed({
        color: COLORS.warn,
        title: `Timeout #${record.caseNumber}`,
        description: `${member.user} timed out for **${minutes} min**.\n**Reason:** ${reason}`,
      }),
    ],
  });
}

/** Shared by /untimeout and /unmute. */
async function applyUntimeout(i: Cached): Promise<void> {
  const member = i.options.getMember("user");
  if (!member) {
    await i.reply({ content: "That user is not a member of this server.", flags: 64 });
    return;
  }
  await member.timeout(null, `by ${i.user.tag}`);
  await i.reply({
    embeds: [embed({ color: COLORS.success, description: `${member.user}'s timeout was removed.` })],
  });
}

export const moderationModule = defineModule({
  id: "moderation",
  name: "Moderation",
  version: "0.0.1",
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member (stored as a moderation case).")
        .addUserOption((o) => o.setName("user").setDescription("Member to warn").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setMaxLength(500)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ModerateMembers))) return;
        const target = i.options.getUser("user", true);
        if (target.id === i.user.id) {
          await i.reply({ content: "You cannot warn yourself.", flags: 64 });
          return;
        }
        const reason = i.options.getString("reason") ?? "No reason provided";
        const record = await services.createCase({
          guildId: i.guild.id,
          action: "warn",
          targetId: target.id,
          moderatorId: i.user.id,
          reason,
        });
        await i.reply({
          embeds: [
            embed({
              color: COLORS.warn,
              title: `Warning #${record.caseNumber}`,
              description: `${target} was warned by ${i.user}.\n**Reason:** ${reason}`,
            }),
          ],
        });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("List active warnings for a member.")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const target = i.options.getUser("user", true);
        const warnings = await services.listActiveWarnings(i.guild.id, target.id);
        if (warnings.length === 0) {
          await i.reply({ embeds: [embed({ color: COLORS.neutral, description: `${target} has no active warnings.` })] });
          return;
        }
        const lines = warnings.slice(0, 15).map((w) => {
          const stamp = Math.floor(w.createdAt.getTime() / 1000);
          return `\`#${w.caseNumber}\` **${w.action}** - ${w.reason ?? "no reason"} *(by <@${w.moderatorId}> <t:${stamp}:R>)*`;
        });
        await i.reply({
          embeds: [
            embed({
              color: COLORS.warn,
              title: `Active warnings for ${target.username}: ${warnings.length}`,
              description: lines.join("\n"),
            }),
          ],
        });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("removewarn")
        .setDescription("Clear all active warnings from a member.")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ModerateMembers))) return;
        const target = i.options.getUser("user", true);
        const cleared = await services.clearActiveWarnings(i.guild.id, target.id);
        await i.reply({
          embeds: [
            embed({
              color: COLORS.success,
              description:
                cleared > 0
                  ? `Removed **${cleared}** active warning(s) from ${target}.`
                  : `${target} has no active warnings to remove.`,
            }),
          ],
        });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Timeout a member.")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("minutes").setDescription("Duration in minutes (1-10080)").setRequired(true).setMinValue(1).setMaxValue(10080),
        )
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setMaxLength(500)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ModerateMembers))) return;
        await applyTimeout(i);
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("mute")
        .setDescription("Mute (timeout) a member - same as /timeout.")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("minutes").setDescription("Duration in minutes (1-10080)").setRequired(true).setMinValue(1).setMaxValue(10080),
        )
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setMaxLength(500)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ModerateMembers))) return;
        await applyTimeout(i);
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a member's timeout.")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ModerateMembers))) return;
        await applyUntimeout(i);
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("unmute")
        .setDescription("Unmute a member - same as /untimeout.")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ModerateMembers))) return;
        await applyUntimeout(i);
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member.")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setMaxLength(500)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.KickMembers))) return;
        const member = i.options.getMember("user");
        if (!member) {
          await i.reply({ content: "That user is not a member of this server.", flags: 64 });
          return;
        }
        const reason = i.options.getString("reason") ?? "No reason provided";
        await member.kick(reason);
        const record = await services.createCase({
          guildId: i.guild.id,
          action: "kick",
          targetId: member.id,
          moderatorId: i.user.id,
          reason,
        });
        await i.reply({
          embeds: [
            embed({
              color: COLORS.error,
              title: `Kick #${record.caseNumber}`,
              description: `${member.user.tag} was kicked.\n**Reason:** ${reason}`,
            }),
          ],
        });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user.")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setMaxLength(500)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.BanMembers))) return;
        const target = i.options.getUser("user", true);
        const reason = i.options.getString("reason") ?? "No reason provided";
        await i.guild.members.ban(target.id, { reason: `${reason} (by ${i.user.tag})` });
        const record = await services.createCase({
          guildId: i.guild.id,
          action: "ban",
          targetId: target.id,
          moderatorId: i.user.id,
          reason,
        });
        await i.reply({
          embeds: [
            embed({
              color: COLORS.error,
              title: `Ban #${record.caseNumber}`,
              description: `${target.tag} was banned.\n**Reason:** ${reason}`,
            }),
          ],
        });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user by ID.")
        .addStringOption((o) => o.setName("user_id").setDescription("User ID").setRequired(true).setMinLength(17).setMaxLength(20))
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setMaxLength(500)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.BanMembers))) return;
        const userId = i.options.getString("user_id", true);
        const reason = i.options.getString("reason") ?? "No reason provided";
        try {
          await i.guild.bans.remove(userId, reason);
        } catch {
          await i.reply({ content: "Could not unban that ID - are they actually banned?", flags: 64 });
          return;
        }
        const record = await services.createCase({
          guildId: i.guild.id,
          action: "unban",
          targetId: userId,
          moderatorId: i.user.id,
          reason,
        });
        await i.reply({
          embeds: [
            embed({
              color: COLORS.success,
              title: `Unban #${record.caseNumber}`,
              description: `<@${userId}> was unbanned.\n**Reason:** ${reason}`,
            }),
          ],
        });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete recent messages in this channel.")
        .addIntegerOption((o) =>
          o.setName("count").setDescription("How many messages (1-100)").setRequired(true).setMinValue(1).setMaxValue(100),
        )
        .addUserOption((o) => o.setName("user").setDescription("Only delete messages from this user")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageMessages))) return;
        const count = i.options.getInteger("count", true);
        const user = i.options.getUser("user");
        const channel = i.channel;
        if (!channel || !channel.isTextBased() || !("bulkDelete" in channel)) {
          await i.reply({ content: "I cannot purge messages in this channel type.", flags: 64 });
          return;
        }
        await i.deferReply({ flags: 64 });
        let messages = await channel.messages.fetch({ limit: count });
        if (user) messages = messages.filter((m) => m.author.id === user.id);
        if (messages.size === 0) {
          await i.editReply("No messages matched.");
          return;
        }
        const deleted = await channel.bulkDelete(messages, true);
        await i.editReply(`Deleted **${deleted.size}** message(s)${user ? ` from ${user}` : ""}.`);
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set slowmode for a channel.")
        .addIntegerOption((o) =>
          o.setName("seconds").setDescription("Seconds (0 disables)").setRequired(true).setMinValue(0).setMaxValue(21600),
        )
        .addChannelOption((o) => o.setName("channel").setDescription("Target channel (default: current)")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageChannels))) return;
        const seconds = i.options.getInteger("seconds", true);
        const channel = i.options.getChannel("channel") ?? i.channel;
        if (!channel || !channel.isTextBased() || !("setRateLimitPerUser" in channel)) {
          await i.reply({ content: "That channel does not support slowmode.", flags: 64 });
          return;
        }
        await channel.setRateLimitPerUser(seconds, `Set by ${i.user.tag}`);
        await i.reply({
          embeds: [
            embed({
              color: COLORS.success,
              description:
                seconds === 0 ? `Slowmode disabled in ${channel}.` : `Slowmode set to **${seconds}s** in ${channel}.`,
            }),
          ],
        });
      },
    },
  ],
});
