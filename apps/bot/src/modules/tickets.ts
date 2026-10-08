import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
  type Guild,
  type GuildMember,
  type ThreadChannel,
} from "discord.js";
import { defineModule } from "@mem/core";
import type { Ticket } from "@mem/db";
import { COLORS, embed, type EmbedBuilder } from "../lib/embed";
import { ensureGuild, ephemeral, requirePermissions, UserError } from "../lib/permissions";
import { services } from "../lib/services";

type TicketConfig = {
  staffRoleId?: string | null;
  logChannelId?: string | null;
  panelChannelId?: string | null;
};

const shortId = (id: string): string => id.slice(0, 8);

function sanitizeName(raw: string): string {
  const clean = raw.replace(/[^\p{L}\p{N} -]/gu, "").trim();
  return (clean || "ticket").slice(0, 90);
}

function isStaff(member: GuildMember, cfg: TicketConfig): boolean {
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageThreads)) return true;
  return !!cfg.staffRoleId && member.roles.cache.has(cfg.staffRoleId);
}

function panelEmbed(): EmbedBuilder {
  return embed({
    color: COLORS.brand,
    title: "🎫 Support tickets",
    description: [
      "Need help? Click the button below to open a **private ticket** — only you and the staff can see it.",
      "",
      "**Staff:** tickets show up in the thread list; claim and close them from the ticket itself.",
    ].join("\n"),
  }).setFooter({ text: "One open ticket per member · powered by Mem" });
}

function openRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:open").setLabel("Open a ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary),
  );
}

function introEmbed(ticket: Ticket, claimedBy?: string | null): EmbedBuilder {
  return embed({
    color: COLORS.brand,
    title: `🎫 Ticket #${shortId(ticket.id)}`,
    description: [
      `Opened by <@${ticket.userId}>.`,
      claimedBy ? `Claimed by <@${claimedBy}>.` : "Waiting to be claimed by staff.",
      "",
      "Describe your issue below and we will get back to you shortly. 🔧",
    ].join("\n"),
  }).setFooter({ text: `Opened <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>` });
}

function introRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:claim").setLabel("Claim").setEmoji("🎯").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Close").setEmoji("🔒").setStyle(ButtonStyle.Danger),
  );
}

async function buildTranscript(thread: ThreadChannel): Promise<{ buffer: Buffer; count: number }> {
  const fetched = await thread.messages.fetch({ limit: 100 }).catch(() => null);
  const msgs = fetched ? [...fetched.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp) : [];
  const lines = msgs.map((m) => {
    const att =
      m.attachments.size > 0
        ? ` [+${m.attachments.size} attachment(s): ${[...m.attachments.values()].map((a) => a.url).join(", ")}]`
        : "";
    return `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag} (${m.author.id}): ${m.content}${att}`;
  });
  const header = `Mem ticket transcript — #${thread.name}\n${msgs.length} message(s) (last 100)\n${"-".repeat(60)}\n`;
  return { buffer: Buffer.from(header + lines.join("\n"), "utf8"), count: msgs.length };
}

/** Shared close flow: DB update, transcript, intro lock, closing note, log, archive. */
async function finishTicket(
  guild: Guild,
  thread: ThreadChannel,
  ticket: Ticket,
  cfg: TicketConfig,
  actorId: string,
  reason: string,
): Promise<number> {
  const closed = await services.closeTicket(ticket.id, reason || null);
  if (!closed) throw new UserError("This ticket is already closed.");

  const { buffer, count } = await buildTranscript(thread);

  if (ticket.messageId) {
    const intro = await thread.messages.fetch(ticket.messageId).catch(() => null);
    if (intro) await intro.edit({ components: [] }).catch(() => undefined);
  }

  await thread
    .send({
      embeds: [
        embed({
          color: COLORS.success,
          title: "🔒 Ticket closed",
          description: `Closed by <@${actorId}>${reason ? ` — ${reason}` : ""}.\nA transcript has been saved. Thanks for reaching out!`,
        }),
      ],
    })
    .catch(() => undefined);

  if (cfg.logChannelId) {
    const logChannel = await guild.channels.fetch(cfg.logChannelId).catch(() => null);
    if (logChannel?.isSendable()) {
      await logChannel
        .send({
          embeds: [
            embed({
              color: COLORS.neutral,
              title: "🎫 Ticket closed",
              description: [
                `Ticket: **#${thread.name}** (<#${thread.id}>)`,
                `Opened by <@${ticket.userId}>${ticket.claimedBy ? ` · claimed by <@${ticket.claimedBy}>` : ""}`,
                `Closed by <@${actorId}> — ${reason || "no reason given"}`,
                `Messages: **${count}**`,
              ].join("\n"),
            }),
          ],
          files: [{ attachment: buffer, name: `transcript-${sanitizeName(thread.name)}.txt` }],
        })
        .catch(() => undefined);
    }
  }

  await thread.setLocked(true).catch(() => undefined);
  await thread.setArchived(true).catch(() => undefined);
  return count;
}

async function createTicketThread(opener: GuildMember, parent: TextChannel): Promise<ThreadChannel | null> {
  return parent.threads
    .create({
      name: sanitizeName(`ticket-${opener.user.username}`),
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: 1440,
      reason: `Support ticket for ${opener.user.username}`,
    })
    .catch(() => null);
}

/** Shared open flow used by both the panel button and /ticket open. */
async function openTicket(
  opener: GuildMember,
  parent: TextChannel,
  cfg: TicketConfig,
): Promise<{ ok: true; thread: ThreadChannel } | { ok: false; error: string; existing?: Ticket }> {
  const existing = await services.getOpenTicketForUser(parent.guild.id, opener.id);
  if (existing) return { ok: false, error: "existing", existing };

  const thread = await createTicketThread(opener, parent);
  if (!thread) return { ok: false, error: "Could not create the ticket thread — check my permissions in this channel." };

  await thread.members.add(opener.id).catch(() => undefined);

  const ticket = await services.createTicket({ guildId: parent.guild.id, channelId: thread.id, userId: opener.id });
  const mention = cfg.staffRoleId ? { content: `<@&${cfg.staffRoleId}>`, allowedMentions: { roles: [cfg.staffRoleId] } } : {};
  const intro = await thread
    .send({ ...mention, embeds: [introEmbed(ticket)], components: [introRow()] })
    .catch(() => null);
  if (intro) await services.setTicketMessage(ticket.id, intro.id).catch(() => undefined);

  return { ok: true, thread };
}

export const ticketsModule = defineModule({
  id: "tickets",
  name: "Tickets",
  version: "0.1.0",
  components: [
    {
      customIdPrefix: "ticket:",
      async execute(interaction) {
        if (!interaction.isButton() || !interaction.inCachedGuild()) return;
        const action = interaction.customId.split(":")[1] ?? "";
        const cfg = (await services.getModuleConfig<TicketConfig>(interaction.guild.id, "tickets")) ?? {};

        if (action === "open") {
          const channel = interaction.channel;
          if (!(channel instanceof TextChannel)) {
            await interaction.reply(ephemeral("Tickets can only be opened from a regular text channel."));
            return;
          }
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const result = await openTicket(interaction.member, channel, cfg);
          if (!result.ok) {
            await interaction.editReply(
              result.existing
                ? `You already have an open ticket: <#${result.existing.channelId}>`
                : result.error,
            );
            return;
          }
          await interaction.editReply(`Your ticket is open: <#${result.thread.id}> — a staff member will be with you shortly. 🎫`);
          return;
        }

        // claim / close — must run from inside the ticket thread
        const thread = interaction.channel;
        if (!thread || !thread.isThread()) {
          await interaction.reply(ephemeral("This button only works inside a ticket thread."));
          return;
        }
        const ticket = await services.getTicketByChannel(thread.id);
        if (!ticket || ticket.status !== "open") {
          await interaction.reply(ephemeral("This ticket is already closed."));
          return;
        }

        if (action === "claim") {
          if (!isStaff(interaction.member, cfg)) {
            await interaction.reply(ephemeral("Only staff can claim tickets."));
            return;
          }
          await interaction.deferReply();
          const claimed = await services.claimTicket(ticket.id, interaction.user.id);
          if (!claimed) {
            await interaction.editReply("This ticket is already closed.");
            return;
          }
          if (ticket.messageId) {
            const intro = await thread.messages.fetch(ticket.messageId).catch(() => null);
            if (intro) await intro.edit({ embeds: [introEmbed(ticket, interaction.user.id)] }).catch(() => undefined);
          }
          await interaction.editReply({ embeds: [embed({ color: COLORS.success, description: `🎯 Claimed by <@${interaction.user.id}>.` })] });
          return;
        }

        if (action === "close") {
          const isOpener = ticket.userId === interaction.user.id;
          if (!isOpener && !isStaff(interaction.member, cfg)) {
            await interaction.reply(ephemeral("Only the opener or staff can close this ticket."));
            return;
          }
          await interaction.deferUpdate();
          await finishTicket(interaction.guild, thread, ticket, cfg, interaction.user.id, "Closed via button").catch(
            async (error: unknown) => {
              await interaction.followUp(ephemeral(error instanceof Error ? error.message : "Could not close the ticket."));
            },
          );
          return;
        }
      },
    },
  ],
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Support tickets: panel, open, close, claim, manage.")
        .addSubcommand((s) =>
          s
            .setName("panel")
            .setDescription("Post the ticket panel (button) in a channel")
            .addChannelOption((o) => o.setName("channel").setDescription("Channel for the panel (defaults to here)")),
        )
        .addSubcommand((s) => s.setName("open").setDescription("Open a ticket right here"))
        .addSubcommand((s) =>
          s
            .setName("close")
            .setDescription("Close this ticket (opener or staff)")
            .addStringOption((o) => o.setName("reason").setDescription("Close reason").setMaxLength(300)),
        )
        .addSubcommand((s) => s.setName("claim").setDescription("Claim this ticket as staff"))
        .addSubcommand((s) =>
          s
            .setName("add")
            .setDescription("Add a member to this ticket")
            .addUserOption((o) => o.setName("user").setDescription("Member to add").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("remove")
            .setDescription("Remove a member from this ticket")
            .addUserOption((o) => o.setName("user").setDescription("Member to remove").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("rename")
            .setDescription("Rename this ticket")
            .addStringOption((o) => o.setName("name").setDescription("New name").setRequired(true).setMaxLength(90)),
        )
        .addSubcommand((s) =>
          s
            .setName("staffrole")
            .setDescription("Set (or clear) the staff role for tickets")
            .addRoleOption((o) => o.setName("role").setDescription("Staff role (omit to clear)")),
        )
        .addSubcommand((s) =>
          s
            .setName("log")
            .setDescription("Set (or clear) the ticket log channel")
            .addChannelOption((o) => o.setName("channel").setDescription("Log channel (omit to clear)")),
        )
        .addSubcommand((s) => s.setName("config").setDescription("Show the ticket settings")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const sub = i.options.getSubcommand();
        const cfg = (await services.getModuleConfig<TicketConfig>(i.guild.id, "tickets")) ?? {};

        if (sub === "panel") {
          if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
          const picked = i.options.getChannel("channel");
          const channel = picked ?? i.channel;
          if (!(channel instanceof TextChannel)) throw new UserError("Pick a regular text channel for the panel.");
          await channel.send({ embeds: [panelEmbed()], components: [openRow()] });
          cfg.panelChannelId = channel.id;
          await services.setModuleConfig(i.guild.id, "tickets", cfg);
          if (cfg.staffRoleId) {
            await channel.permissionOverwrites
              .edit(cfg.staffRoleId, {
                ManageThreads: true,
                SendMessagesInThreads: true,
                ViewChannel: true,
              })
              .catch(() => undefined);
          }
          await i.reply(ephemeral(`Ticket panel posted in <#${channel.id}>.`));
          return;
        }

        if (sub === "open") {
          const channel = i.channel;
          if (!(channel instanceof TextChannel)) throw new UserError("Tickets can only be opened from a regular text channel.");
          const result = await openTicket(i.member, channel, cfg);
          if (!result.ok) {
            throw new UserError(
              result.existing ? `You already have an open ticket: <#${result.existing.channelId}>` : result.error,
            );
          }
          await i.reply(ephemeral(`Your ticket is open: <#${result.thread.id}> 🎫`));
          return;
        }

        if (sub === "staffrole") {
          if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
          const role = i.options.getRole("role");
          cfg.staffRoleId = role?.id ?? null;
          await services.setModuleConfig(i.guild.id, "tickets", cfg);
          await i.reply(ephemeral(role ? `Staff role set to <@&${role.id}>.` : "Staff role cleared."));
          return;
        }

        if (sub === "log") {
          if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
          const channel = i.options.getChannel("channel");
          if (channel && !channel.isSendable()) throw new UserError("That channel cannot receive logs.");
          cfg.logChannelId = channel?.id ?? null;
          await services.setModuleConfig(i.guild.id, "tickets", cfg);
          await i.reply(ephemeral(channel ? `Ticket logs will go to <#${channel.id}>.` : "Ticket logging disabled."));
          return;
        }

        if (sub === "config") {
          if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
          const openCount = await services.countOpenTickets(i.guild.id);
          const panel = embed({ color: COLORS.brand, title: "⚙️ Ticket settings" })
            .setDescription(
              [
                `Staff role: ${cfg.staffRoleId ? `<@&${cfg.staffRoleId}>` : "*none (Manage Threads staff see tickets)*"}`,
                `Log channel: ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : "*off*"}`,
                `Panel channel: ${cfg.panelChannelId ? `<#${cfg.panelChannelId}>` : "*not posted yet — run `/ticket panel`*"}`,
                `Open tickets right now: **${openCount}**`,
              ].join("\n"),
            )
            .setFooter({ text: "Commands: /ticket panel · open · close · claim · add · remove · rename" });
          await i.reply({ embeds: [panel], flags: MessageFlags.Ephemeral });
          return;
        }

        // thread-scoped commands: close / claim / add / remove / rename
        const channel = i.channel;
        if (!channel || !channel.isThread()) {
          throw new UserError("Run this inside a ticket thread.");
        }
        const thread = channel;
        const ticket = await services.getTicketByChannel(thread.id);
        if (!ticket || ticket.status !== "open") throw new UserError("This is not an open ticket.");
        const isOpener = ticket.userId === i.user.id;
        const staff = isStaff(i.member, cfg);

        if (sub === "close") {
          if (!isOpener && !staff) throw new UserError("Only the opener or staff can close this ticket.");
          await i.deferReply();
          const reason = i.options.getString("reason") ?? "";
          const count = await finishTicket(i.guild, thread, ticket, cfg, i.user.id, reason);
          await i.editReply(`Ticket closed — ${count} message(s) archived. 🔒`);
          return;
        }

        if (sub === "claim") {
          if (!staff) throw new UserError("Only staff can claim tickets.");
          await i.deferReply();
          const claimed = await services.claimTicket(ticket.id, i.user.id);
          if (!claimed) {
            await i.editReply("This ticket is already closed.");
            return;
          }
          if (ticket.messageId) {
            const intro = await thread.messages.fetch(ticket.messageId).catch(() => null);
            if (intro) await intro.edit({ embeds: [introEmbed(ticket, i.user.id)] }).catch(() => undefined);
          }
          await i.editReply({ embeds: [embed({ color: COLORS.success, description: `🎯 Claimed by <@${i.user.id}>.` })] });
          return;
        }

        if (sub === "add") {
          if (!staff) throw new UserError("Only staff can add members to tickets.");
          const user = i.options.getUser("user", true);
          await thread.members.add(user.id);
          await i.reply({ embeds: [embed({ color: COLORS.brand, description: `➕ <@${user.id}> was added to this ticket.` })] });
          return;
        }

        if (sub === "remove") {
          if (!staff) throw new UserError("Only staff can remove members from tickets.");
          const user = i.options.getUser("user", true);
          if (user.id === ticket.userId) throw new UserError("You can't remove the ticket opener — close the ticket instead.");
          await thread.members.remove(user.id);
          await i.reply({ embeds: [embed({ color: COLORS.brand, description: `➖ <@${user.id}> was removed from this ticket.` })] });
          return;
        }

        if (sub === "rename") {
          if (!staff && !isOpener) throw new UserError("Only the opener or staff can rename this ticket.");
          const name = i.options.getString("name", true);
          await thread.setName(sanitizeName(name));
          await i.reply({ embeds: [embed({ color: COLORS.brand, description: `✏️ Renamed to **${sanitizeName(name)}**.` })] });
          return;
        }
      },
    },
  ],
});
