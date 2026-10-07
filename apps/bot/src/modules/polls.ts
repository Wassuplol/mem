import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type Client,
  type EmbedBuilder,
  type ModalSubmitInteraction,
} from "discord.js";
import { defineModule, type ComponentHandler, type ComponentInteraction, type SlashCommand } from "@mem/core";
import type { Poll } from "@mem/db";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild, ephemeral, requirePermissions, UserError } from "../lib/permissions";
import { services } from "../lib/services";

const BAR_CELLS = 12;
const MAX_OPTIONS = 10;

type PollTally = { counts: number[]; totalVotes: number; voterCount: number };

const truncate = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

const isExpired = (poll: Poll): boolean => poll.endsAt !== null && poll.endsAt.getTime() <= Date.now();

/** Resolve a human-readable author label (never show raw IDs). */
async function authorLabel(client: Client, authorId: string): Promise<string> {
  const user = await client.users.fetch(authorId).catch(() => null);
  return user?.displayName ?? "someone";
}

/** Shared renderer: live polish embed + vote buttons (or the frozen final view). */
function renderPoll(
  poll: Poll,
  tally: PollTally,
  opts: { closed: boolean; author: string },
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const lines = poll.options.map((label, idx) => {
    const count = tally.counts[idx] ?? 0;
    const pct = tally.voterCount === 0 ? 0 : Math.round((count / tally.voterCount) * 100);
    const filled = Math.round((pct / 100) * BAR_CELLS);
    const bar = "█".repeat(filled) + "░".repeat(BAR_CELLS - filled);
    const crown = opts.closed && tally.voterCount > 0 && count === Math.max(...tally.counts) ? " 👑" : "";
    return `**${idx + 1}.** ${label}${crown}\n\`${bar}\` **${count}** · ${pct}%`;
  });
  if (poll.multiple) lines.push("", "*Multi-select - toggle as many as you like.*");
  if (poll.endsAt) {
    const stamp = Math.floor(poll.endsAt.getTime() / 1000);
    lines.push("", opts.closed ? `🏁 Closed <t:${stamp}:R>` : `⏳ Closes <t:${stamp}:R>`);
  } else if (opts.closed) {
    lines.push("", "🏁 Closed");
  } else {
    lines.push("", "⏳ No time limit - ends manually.");
  }

  const builder = embed({
    title: `📊 ${truncate(poll.question, 240)}`,
    description: lines.join("\n"),
    color: opts.closed ? COLORS.neutral : COLORS.brand,
  });

  builder.setFooter({
    text: [`By ${opts.author}`, `${tally.voterCount} voter(s) · ${tally.totalVotes} vote(s)`].join(" · "),
  });

  if (opts.closed) return { embeds: [builder], components: [] };

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let row = new ActionRowBuilder<ButtonBuilder>();
  poll.options.forEach((label, idx) => {
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder<ButtonBuilder>();
    }
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`poll:vote:${poll.id}:${idx}`)
        .setLabel(truncate(`${idx + 1}. ${label}`, 78))
        .setStyle(ButtonStyle.Secondary),
    );
  });
  row.addComponents(new ButtonBuilder().setCustomId(`poll:end:${poll.id}`).setLabel("End poll").setStyle(ButtonStyle.Danger));
  rows.push(row);
  return { embeds: [builder], components: rows };
}

/** Lazy close: polls end on time without timers - first interaction after endsAt freezes them. */
async function freezeIfExpired(poll: Poll): Promise<boolean> {
  if (poll.closed) return true;
  if (isExpired(poll)) {
    await services.closePoll(poll.id);
    return true;
  }
  return false;
}

async function onVote(interaction: ButtonInteraction, pollId: string, optionIndex: number): Promise<void> {
  const poll = await services.getPoll(pollId);
  if (!poll) {
    await interaction.reply(ephemeral("This poll no longer exists."));
    return;
  }
  const closed = await freezeIfExpired(poll);
  if (closed) {
    const tally = await services.getPollTally(poll.id);
    await interaction.update(
      renderPoll(poll, tally, { closed: true, author: await authorLabel(interaction.client, poll.authorId) }),
    );
    return;
  }
  if (optionIndex < 0 || optionIndex >= poll.options.length) return;
  await services.votePoll(poll.id, interaction.user.id, optionIndex);
  const tally = await services.getPollTally(poll.id);
  await interaction.update(
    renderPoll(poll, tally, { closed: false, author: await authorLabel(interaction.client, poll.authorId) }),
  );
}

async function onEndButton(interaction: ButtonInteraction, pollId: string): Promise<void> {
  const poll = await services.getPoll(pollId);
  if (!poll) {
    await interaction.reply(ephemeral("This poll no longer exists."));
    return;
  }
  const isAuthor = interaction.user.id === poll.authorId;
  const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ?? false;
  if (!isAuthor && !canManage) {
    await interaction.reply(ephemeral("Only the poll author or a moderator can end this poll."));
    return;
  }
  if (!poll.closed) await services.closePoll(poll.id);
  const tally = await services.getPollTally(poll.id);
  await interaction.update(
    renderPoll(poll, tally, { closed: true, author: await authorLabel(interaction.client, poll.authorId) }),
  );
}

async function onCreateModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.channelId) {
    await interaction.reply(ephemeral("Polls can only be created inside a server channel."));
    return;
  }
  const parts = interaction.customId.split(":");
  const multiple = parts[2] === "1";
  const duration = Number.parseInt(parts[3] ?? "0", 10);

  const question = interaction.fields.getTextInputValue("question").trim();
  const options = interaction.fields
    .getTextInputValue("options")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (options.length < 2) {
    await interaction.reply(ephemeral("A poll needs at least 2 options (one per line)."));
    return;
  }
  if (options.length > MAX_OPTIONS) {
    await interaction.reply(ephemeral(`That is ${options.length} options - the max is ${MAX_OPTIONS}.`));
    return;
  }
  const tooLong = options.find((option) => option.length > 100);
  if (tooLong) {
    await interaction.reply(ephemeral(`Each option must be 100 characters or fewer: "${tooLong.slice(0, 40)}..."`));
    return;
  }

  await services.ensureGuild(interaction.guildId);
  const poll = await services.createPoll({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    authorId: interaction.user.id,
    question: question.slice(0, 256),
    options,
    multiple,
    durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : null,
  });

  const tally = await services.getPollTally(poll.id);
  await interaction.reply(
    renderPoll(poll, tally, { closed: false, author: interaction.user.displayName ?? interaction.user.username }),
  );
  try {
    const message = await interaction.fetchReply();
    await services.attachPollMessage(poll.id, message.id);
  } catch (error) {
    console.warn("[mem] poll create: could not record message id:", error);
  }
}

const pollCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Polls with live results: create, end, list.")
    .addSubcommand((s) =>
      s
        .setName("create")
        .setDescription("Create a poll (opens a short form for question + options).")
        .addBooleanOption((o) => o.setName("multiple").setDescription("Allow voting for several options?"))
        .addIntegerOption((o) =>
          o.setName("duration").setDescription("Optional: auto-close after N minutes").setMinValue(1).setMaxValue(10080),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("end")
        .setDescription("End a poll early and freeze the results (author or moderators).")
        .addStringOption((o) => o.setName("id").setDescription("Poll message ID or link").setRequired(true)),
    )
    .addSubcommand((s) => s.setName("list").setDescription("List open polls in this server.")),
  async execute(interaction) {
    const i = await ensureGuild(interaction);
    const sub = i.options.getSubcommand(true);

    if (sub === "create") {
      const multiple = i.options.getBoolean("multiple") ?? false;
      const duration = i.options.getInteger("duration") ?? 0;
      const modal = new ModalBuilder()
        .setCustomId(`poll:create:${multiple ? "1" : "0"}:${duration}`)
        .setTitle("Create a poll")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("question")
              .setLabel("Question")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("What should we have for lunch?")
              .setMaxLength(256)
              .setRequired(true),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("options")
              .setLabel(`Options - one per line (2-${MAX_OPTIONS})`)
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder("Pizza\nSushi\nTacos")
              .setMaxLength(1500)
              .setRequired(true),
          ),
        );
      await i.showModal(modal);
      return;
    }

    if (sub === "end") {
      const raw = i.options.getString("id", true).trim();
      const messageId = raw.split("/").filter(Boolean).pop() ?? raw;
      if (!/^\d{17,20}$/.test(messageId)) {
        throw new UserError("That does not look like a message ID or link.");
      }
      const poll = await services.getPollByMessage(messageId);
      if (!poll) {
        throw new UserError("No poll found for that message. Polls from before the database era are unmanageable.");
      }
      const isAuthor = i.user.id === poll.authorId;
      if (!isAuthor && !(await requirePermissions(i, PermissionFlagsBits.ManageMessages))) return;
      if (!poll.closed) await services.closePoll(poll.id);
      const tally = await services.getPollTally(poll.id);
      const channelId = poll.channelId ?? i.channelId;
      try {
        const channel = await i.client.channels.fetch(channelId);
        if (channel?.isTextBased()) {
          const message = await channel.messages.fetch(messageId);
          await message.edit(
            renderPoll(poll, tally, { closed: true, author: await authorLabel(i.client, poll.authorId) }),
          );
        }
      } catch (error) {
        console.warn("[mem] poll end: could not edit poll message:", error);
      }
      await i.reply(ephemeral("Poll ended - final results are frozen. 👑 marks the winner(s)."));
      return;
    }

    if (sub === "list") {
      const open = await services.listOpenPolls(i.guild.id);
      if (open.length === 0) {
        await i.reply({ embeds: [embed({ color: COLORS.neutral, description: "No open polls in this server. Start one with `/poll create`." })] });
        return;
      }
      const lines = open.map((poll) => {
        const link = poll.messageId ? `https://discord.com/channels/${poll.guildId}/${poll.channelId}/${poll.messageId}` : null;
        const title = link ? `[${truncate(poll.question, 60)}](${link})` : truncate(poll.question, 60);
        const ends = poll.endsAt ? ` · closes <t:${Math.floor(poll.endsAt.getTime() / 1000)}:R>` : "";
        return `📊 ${title} - by <@${poll.authorId}>${ends}`;
      });
      await i.reply({ embeds: [embed({ title: `Open polls: ${open.length}`, description: lines.join("\n") })] });
    }
  },
};

const pollComponents: ComponentHandler = {
  customIdPrefix: "poll:",
  async execute(interaction: ComponentInteraction, _ctx) {
    const parts = interaction.customId.split(":");
    const kind = parts[1];

    if (kind === "create") {
      if (!interaction.isModalSubmit()) return;
      await onCreateModal(interaction);
      return;
    }

    if (!interaction.isButton()) return;

    if (kind === "vote") {
      const pollId = parts[2];
      const optionIndex = Number.parseInt(parts[3] ?? "-1", 10);
      if (!pollId) return;
      await onVote(interaction, pollId, Number.isFinite(optionIndex) ? optionIndex : -1);
      return;
    }

    if (kind === "end") {
      const pollId = parts[2];
      if (!pollId) return;
      await onEndButton(interaction, pollId);
    }
  },
};

export const pollsModule = defineModule({
  id: "polls",
  name: "Polls",
  version: "0.0.1",
  commands: [pollCommand],
  components: [pollComponents],
});
