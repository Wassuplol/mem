import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildMember,
  type Message,
  type NewsChannel,
  type PartialMessage,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import { defineModule } from "@mem/core";
import { services } from "../lib/services";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild, requirePermissions, UserError } from "../lib/permissions";

/* ---------- snipe stores (RAM-lean: capped, per-channel, process-local) ---------- */

interface SnipeEntry {
  content: string;
  authorId: string;
  authorName: string;
  at: number;
  attachments: number;
}

interface EditEntry {
  before: string;
  after: string;
  authorId: string;
  authorName: string;
  at: number;
}

const SNIPE_CAP = 250;
const deletedSnipes = new Map<string, SnipeEntry>();
const editedSnipes = new Map<string, EditEntry>();

function remember<T>(map: Map<string, T>, key: string, value: T): void {
  if (map.size >= SNIPE_CAP && !map.has(key)) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, value);
}

function guardMember(actor: GuildMember, target: GuildMember): void {
  if (target.id === actor.client.user?.id) throw new UserError("That's me! I won't do that to myself.");
  if (target.id === actor.guild.ownerId) throw new UserError("I can't act on the server owner.");
  if (target.roles.highest.position >= actor.roles.highest.position) {
    throw new UserError("That member's highest role is equal to or above yours - I can't touch them.");
  }
}

export const modtoolsModule = defineModule({
  id: "modtools",
  name: "Mod tools",
  version: "0.0.1",
  commands: [
    /* ---------- /lock ---------- */
    {
      data: new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock a channel - deny @everyone from sending messages.")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel (default: current)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement),
        )
        .addStringOption((o) => o.setName("reason").setDescription("Why lock it").setMaxLength(300)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageChannels))) return;
        const channel = (i.options.getChannel("channel") ?? i.channel) as TextChannel | VoiceChannel | NewsChannel | null;
        if (!channel || !channel.permissionOverwrites) {
          await i.reply({ content: "I can't manage that channel type.", flags: 64 });
          return;
        }
        await channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
        const reason = i.options.getString("reason");
        await i.reply({
          embeds: [
            embed({
              title: "🔒 Channel locked",
              description: `<#${channel.id}> is locked - nobody can talk.${reason ? `\n**Reason:** ${reason}` : ""}`,
            }),
          ],
        });
      },
    },
    /* ---------- /unlock ---------- */
    {
      data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock a channel (restore @everyone send permission).")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel (default: current)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement),
        )
        .addStringOption((o) => o.setName("reason").setDescription("Why unlock it").setMaxLength(300)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageChannels))) return;
        const channel = (i.options.getChannel("channel") ?? i.channel) as TextChannel | VoiceChannel | NewsChannel | null;
        if (!channel || !channel.permissionOverwrites) {
          await i.reply({ content: "I can't manage that channel type.", flags: 64 });
          return;
        }
        await channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
        const reason = i.options.getString("reason");
        await i.reply({
          embeds: [
            embed({
              title: "🔓 Channel unlocked",
              description: `<#${channel.id}> is unlocked - talk away.${reason ? `\n**Reason:** ${reason}` : ""}`,
            }),
          ],
        });
      },
    },
    /* ---------- /softban ---------- */
    {
      data: new SlashCommandBuilder()
        .setName("softban")
        .setDescription("Ban then instantly unban a member - purges their recent messages.")
        .addUserOption((o) => o.setName("user").setDescription("Member to softban").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("days").setDescription("Delete this many days of their messages (1-7, default 1)").setMinValue(1).setMaxValue(7),
        )
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setMaxLength(500)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.BanMembers))) return;
        const target = i.options.getUser("user", true);
        const targetMember = await i.guild.members.fetch(target.id).catch(() => null);
        if (targetMember && i.member) guardMember(i.member as GuildMember, targetMember);
        const days = i.options.getInteger("days") ?? 1;
        const reason = i.options.getString("reason") ?? "No reason provided";
        await i.guild.members.ban(target.id, {
          deleteMessageSeconds: days * 86400,
          reason: `${reason} (softban by ${i.user.tag})`,
        });
        await i.guild.members.unban(target.id, "softban - message purge complete");
        const record = await services.createCase({
          guildId: i.guild.id,
          action: "softban",
          targetId: target.id,
          moderatorId: i.user.id,
          reason,
        });
        await i.reply({
          embeds: [
            embed({
              color: COLORS.error,
              title: `Softban #${record.caseNumber}`,
              description: `${target.tag} was softbanned - ${days} day(s) of messages purged.\n**Reason:** ${reason}`,
            }),
          ],
        });
      },
    },
    /* ---------- /snipe ---------- */
    {
      data: new SlashCommandBuilder().setName("snipe").setDescription("Show the most recently deleted message in this channel."),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageMessages))) return;
        const entry = deletedSnipes.get(i.channelId);
        if (!entry) {
          await i.reply({ content: "Nothing to snipe here - no recently deleted messages.", flags: 64 });
          return;
        }
        await i.reply({
          embeds: [
            embed({
              title: "Snipe",
              description: `**${entry.authorName}** (<@${entry.authorId}>) • <t:${Math.floor(entry.at / 1000)}:R>${
                entry.attachments ? ` • ${entry.attachments} attachment(s)` : ""
              }\n>>> ${(entry.content || "(no text - attachment only)").slice(0, 1500)}`,
            }),
          ],
        });
      },
    },
    /* ---------- /editsnipe ---------- */
    {
      data: new SlashCommandBuilder().setName("editsnipe").setDescription("Show the most recently edited message's previous text."),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageMessages))) return;
        const entry = editedSnipes.get(i.channelId);
        if (!entry) {
          await i.reply({ content: "Nothing to editsnipe here - no recently edited messages.", flags: 64 });
          return;
        }
        await i.reply({
          embeds: [
            embed({
              title: "Edit snipe",
              description: `**${entry.authorName}** (<@${entry.authorId}>) • <t:${Math.floor(entry.at / 1000)}:R>\n**Before:**\n>>> ${entry.before.slice(
                0,
                700,
              )}\n**After:**\n>>> ${entry.after.slice(0, 700) || "(empty)"}`,
            }),
          ],
        });
      },
    },
    /* ---------- /note ---------- */
    {
      data: new SlashCommandBuilder()
        .setName("note")
        .setDescription("Private staff notes about a member.")
        .addSubcommand((s) =>
          s
            .setName("add")
            .setDescription("Add a note.")
            .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
            .addStringOption((o) => o.setName("text").setDescription("Note text").setRequired(true).setMaxLength(500)),
        )
        .addSubcommand((s) =>
          s
            .setName("list")
            .setDescription("List notes for a member.")
            .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("remove")
            .setDescription("Remove a note by its short id (from /note list).")
            .addStringOption((o) => o.setName("id").setDescription("Short id, e.g. a1b2c3d4").setRequired(true).setMinLength(6).setMaxLength(36)),
        ),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ModerateMembers))) return;
        const sub = i.options.getSubcommand(true);

        if (sub === "add") {
          const user = i.options.getUser("user", true);
          const text = i.options.getString("text", true);
          const note = await services.addNote({ guildId: i.guild.id, userId: user.id, authorId: i.user.id, content: text });
          const total = await services.countNotes(i.guild.id, user.id);
          await i.reply({
            embeds: [
              embed({
                title: "📝 Note added",
                description: `Note \`${note.id.slice(0, 8)}\` added for <@${user.id}> (${total} total).`,
              }),
            ],
          });
          return;
        }

        if (sub === "list") {
          const user = i.options.getUser("user", true);
          const notes = await services.listNotes(i.guild.id, user.id, 10);
          const total = await services.countNotes(i.guild.id, user.id);
          if (!notes.length) {
            await i.reply({ embeds: [embed({ description: `No notes for <@${user.id}>.` })] });
            return;
          }
          const body = notes
            .map(
              (n) =>
                `**\`${n.id.slice(0, 8)}\`** • <@${n.authorId}> • <t:${Math.floor(n.createdAt.getTime() / 1000)}:R>\n${n.content}`,
            )
            .join("\n\n")
            .slice(0, 4000);
          await i.reply({
            embeds: [
              embed({ title: `Notes - ${user.username}`, description: body }).setFooter({ text: `${total} total - showing ${notes.length}` }),
            ],
          });
          return;
        }

        // remove
        const id = i.options.getString("id", true);
        const removed = await services.removeNoteByPrefix(i.guild.id, id);
        if (!removed) {
          await i.reply({ content: "No note with that id (check /note list).", flags: 64 });
          return;
        }
        await i.reply({
          embeds: [
            embed({
              title: "🗑️ Note removed",
              description: `Removed note for <@${removed.userId}> (by <@${removed.authorId}>):\n> ${removed.content.slice(0, 300)}`,
            }),
          ],
        });
      },
    },
    /* ---------- /modstats ---------- */
    {
      data: new SlashCommandBuilder()
        .setName("modstats")
        .setDescription("Moderation action stats for a moderator.")
        .addUserOption((o) => o.setName("moderator").setDescription("Moderator (default: you)")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ModerateMembers))) return;
        const target = i.options.getUser("moderator") ?? i.user;
        const rows = await services.modStats(i.guild.id, target.id);
        if (!rows.length) {
          await i.reply({ embeds: [embed({ description: `No moderation cases by <@${target.id}> yet.` })] });
          return;
        }
        rows.sort((a, b) => b.total - a.total);
        const total = rows.reduce((n, r) => n + r.total, 0);
        const body = rows.map((r) => `**${r.action}** — ${r.total} total • ${r.recent} last 30d`).join("\n");
        await i.reply({
          embeds: [
            embed({ title: `Mod stats - ${target.username}`, description: body }).setFooter({ text: `${total} cases all-time` }),
          ],
        });
      },
    },
  ],
  events: [
    {
      name: "messageDelete",
      async execute(message: Message | PartialMessage) {
        if (!message.guildId || message.author?.bot) return;
        const content = message.content ?? "";
        const attachments = message.attachments?.size ?? 0;
        if (!content && !attachments) return;
        remember(deletedSnipes, message.channelId, {
          content,
          authorId: message.author?.id ?? "0",
          authorName: message.author?.username ?? "unknown",
          at: Date.now(),
          attachments,
        });
      },
    },
    {
      name: "messageUpdate",
      async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
        if (!oldMessage.guildId || oldMessage.author?.bot) return;
        const before = oldMessage.content ?? "";
        const after = newMessage.content ?? "";
        if (!before || before === after) return;
        remember(editedSnipes, oldMessage.channelId, {
          before,
          after,
          authorId: oldMessage.author?.id ?? "0",
          authorName: oldMessage.author?.username ?? "unknown",
          at: Date.now(),
        });
      },
    },
  ],
});
