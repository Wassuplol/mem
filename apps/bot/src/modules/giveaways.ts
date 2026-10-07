import { randomInt } from "node:crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type Client,
} from "discord.js";
import { defineModule, type ComponentHandler, type SlashCommand } from "@mem/core";
import type { Giveaway } from "@mem/db";
import { COLORS, embed, type EmbedBuilder } from "../lib/embed";
import { formatDuration, parseDuration } from "../lib/duration";
import { ensureGuild, ephemeral, requirePermissions, UserError } from "../lib/permissions";
import { services } from "../lib/services";
import { registerTaskHandler } from "../lib/scheduler";

const MIN_MS = 60_000;
const MAX_MS = 30 * 86_400_000;
const shortId = (id: string): string => id.slice(0, 8);

/** Fisher-Yates with crypto randomness; returns at most `count` winners. */
function pickWinners(pool: string[], count: number): string[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const a = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = a;
  }
  return arr.slice(0, Math.min(count, arr.length));
}

function entryRow(giveawayId: string, disabled: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw:enter:${giveawayId}`)
      .setLabel(disabled ? "Giveaway ended" : "Enter giveaway")
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
  );
}

function cardEmbed(gw: Giveaway, entryCount: number): EmbedBuilder {
  const stamp = Math.floor(gw.endsAt.getTime() / 1_000);
  const winners = gw.winners ?? [];
  const lines = [
    `Prize: **${gw.prize}**`,
    "",
    gw.ended
      ? `🎊 Ended - winner${winners.length === 1 ? "" : "s"}: ${
          winners.length > 0 ? winners.map((w) => `<@${w}>`).join(", ") : "none (no entries)"
        }`
      : `Click the button below to enter!\nEnds <t:${stamp}:R> (<t:${stamp}:f>)`,
    "",
    `Hosted by <@${gw.hostId}> · **${entryCount}** entr${entryCount === 1 ? "y" : "ies"} · ${gw.winnerCount} winner${
      gw.winnerCount === 1 ? "" : "s"
    }`,
  ];
  return embed({ color: COLORS.brand, title: `🎉 GIVEAWAY - ${gw.prize}`, description: lines.join("\n") }).setFooter({
    text: `id ${shortId(gw.id)}`,
  });
}

/**
 * Draws winners, freezes the giveaway and repaints the card + announcement.
 * Returns null when someone else finished it first.
 */
async function finishGiveawayFlow(
  client: Client,
  gw: Giveaway,
  opts: { reroll?: boolean; winnerCount?: number } = {},
): Promise<Giveaway | null> {
  const entries = await services.listGiveawayEntries(gw.id);
  const pool = entries.map((entry) => entry.userId);
  const count = Math.max(1, Math.min(opts.winnerCount ?? gw.winnerCount, 10));

  let winners: string[];
  if (opts.reroll) {
    // Prefer people who have not won this one yet.
    const previous = new Set(gw.winners ?? []);
    const fresh = pool.filter((id) => !previous.has(id));
    winners = pickWinners(fresh.length >= count ? fresh : pool, count);
  } else {
    winners = pickWinners(pool, count);
  }

  const updated = opts.reroll
    ? await services.setGiveawayWinners(gw.id, winners)
    : await services.finishGiveaway(gw.id, winners);
  if (!updated) return null;

  const channel = await client.channels.fetch(gw.channelId).catch(() => null);
  if (channel && channel.isTextBased() && "send" in channel && "messages" in channel) {
    if (gw.messageId) {
      const message = await channel.messages.fetch(gw.messageId).catch(() => null);
      if (message) {
        await message
          .edit({ embeds: [cardEmbed(updated, pool.length)], components: [entryRow(gw.id, true)] })
          .catch((error: unknown) => console.warn("[mem] giveaway: card edit failed:", error));
      }
    }
    const content =
      winners.length > 0
        ? `🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(", ")} - you won **${gw.prize}**!`
        : `🎉 The giveaway for **${gw.prize}** ended with no entries.`;
    await channel
      .send({ content, allowedMentions: { users: winners } })
      .catch((error: unknown) => console.warn("[mem] giveaway: winner announcement failed:", error));
  }
  return updated;
}

/* ---------- live entry counter (throttled so a popular giveaway cannot spam edits) ---------- */

const cardEditAt = new Map<string, number>();
const CARD_EDIT_THROTTLE_MS = 8_000;

function refreshCardThrottled(client: Client, gw: Giveaway, count: number): void {
  const now = Date.now();
  if (now - (cardEditAt.get(gw.id) ?? 0) < CARD_EDIT_THROTTLE_MS) return;
  if (cardEditAt.size > 500) cardEditAt.clear();
  cardEditAt.set(gw.id, now);
  void (async () => {
    try {
      const channel = await client.channels.fetch(gw.channelId);
      if (!channel || !channel.isTextBased() || !("messages" in channel) || !gw.messageId) return;
      const message = await channel.messages.fetch(gw.messageId);
      await message.edit({ embeds: [cardEmbed(gw, count)] });
    } catch {
      /* best-effort: the end-of-giveaway edit always repaints the final state */
    }
  })();
}

/* ---------- /giveaway ---------- */

const giveawayCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Giveaways: prizes, entries, automatic winner draw.")
    .addSubcommand((s) =>
      s
        .setName("start")
        .setDescription("Start a giveaway.")
        .addStringOption((o) =>
          o.setName("prize").setDescription("What are you giving away?").setRequired(true).setMaxLength(200),
        )
        .addStringOption((o) => o.setName("duration").setDescription("How long: 30m, 2h, 1d...").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("winners").setDescription("How many winners (1-10, default 1)").setMinValue(1).setMaxValue(10),
        )
        .addChannelOption((o) => o.setName("channel").setDescription("Where to post (default: here)")),
    )
    .addSubcommand((s) =>
      s
        .setName("end")
        .setDescription("End a giveaway early and draw winners now.")
        .addStringOption((o) =>
          o.setName("id").setDescription("Pick a running giveaway").setRequired(true).setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("reroll")
        .setDescription("Draw new winners for an ended giveaway.")
        .addStringOption((o) =>
          o.setName("id").setDescription("Pick an ended giveaway").setRequired(true).setAutocomplete(true),
        )
        .addIntegerOption((o) =>
          o.setName("winners").setDescription("How many winners (default: same as before)").setMinValue(1).setMaxValue(10),
        ),
    )
    .addSubcommand((s) => s.setName("list").setDescription("List running giveaways.")),
  async execute(interaction, ctx) {
    const i = await ensureGuild(interaction);
    const sub = i.options.getSubcommand(true);

    if (sub === "start") {
      if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
      const prize = i.options.getString("prize", true).trim();
      if (!prize) throw new UserError("Give the prize a name!");
      const durMs = parseDuration(i.options.getString("duration", true));
      if (durMs === null) throw new UserError("Could not read that duration - try `30m`, `2h` or `1d`.");
      if (durMs < MIN_MS) throw new UserError("Giveaways need at least 1 minute.");
      if (durMs > MAX_MS) throw new UserError("Giveaways can run at most 30 days.");
      const winners = i.options.getInteger("winners") ?? 1;
      const target = i.options.getChannel("channel") ?? i.channel;
      if (!target || !target.isTextBased() || !("send" in target)) {
        throw new UserError("I cannot post a giveaway in that channel.");
      }
      const endsAt = new Date(Date.now() + durMs);
      const gw = await services.createGiveaway({
        guildId: i.guild.id,
        channelId: target.id,
        hostId: i.user.id,
        prize,
        winnerCount: winners,
        endsAt,
      });
      const card = await target.send({ embeds: [cardEmbed(gw, 0)], components: [entryRow(gw.id, false)] });
      await services.attachGiveawayMessage(gw.id, card.id);
      await services.scheduleTask({
        guildId: i.guild.id,
        kind: "giveaway_end",
        payload: { giveawayId: gw.id },
        runAt: endsAt,
      });
      const stamp = Math.floor(endsAt.getTime() / 1_000);
      await i.reply(
        ephemeral(`🎉 Giveaway started in ${target} - runs for **${formatDuration(durMs)}**, ends <t:${stamp}:R>. id \`${shortId(gw.id)}\`.`),
      );
      return;
    }

    if (sub === "list") {
      const open = await services.listGiveaways(i.guild.id, { openOnly: true, limit: 10 });
      if (open.length === 0) {
        await i.reply(ephemeral("No running giveaways - start one with `/giveaway start`."));
        return;
      }
      const lines: string[] = [];
      for (const gw of open) {
        const stamp = Math.floor(gw.endsAt.getTime() / 1_000);
        const entries = await services.countGiveawayEntries(gw.id);
        lines.push(
          `\`${shortId(gw.id)}\` **${gw.prize}** - ends <t:${stamp}:R> · ${entries} entr${entries === 1 ? "y" : "ies"}`,
        );
      }
      await i.reply({
        embeds: [embed({ title: `Running giveaways: ${open.length}`, description: lines.join("\n") })],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const id = i.options.getString("id", true);
    const gw = await services.getGiveaway(id);
    if (!gw || gw.guildId !== i.guild.id) throw new UserError("No giveaway found with that id.");

    if (sub === "end") {
      if (gw.hostId !== i.user.id && !(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
      if (gw.ended) throw new UserError("That giveaway already ended - use `/giveaway reroll` to redraw.");
      await i.deferReply();
      const done = await finishGiveawayFlow(ctx.client, gw);
      await i.editReply(
        done ? `🎊 **${gw.prize}** ended - winners drawn and announced.` : "Someone else already ended that giveaway.",
      );
      return;
    }

    // sub === "reroll"
    if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
    if (!gw.ended) throw new UserError("That giveaway is still running - end it first.");
    await i.deferReply();
    await finishGiveawayFlow(ctx.client, gw, {
      reroll: true,
      winnerCount: i.options.getInteger("winners") ?? gw.winnerCount,
    });
    await i.editReply(`🎲 Rerolled - fresh winner(s) drawn for **${gw.prize}**.`);
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId) {
      await interaction.respond([]);
      return;
    }
    const sub = interaction.options.getSubcommand(true);
    const query = interaction.options.getFocused().trim().toLowerCase();
    const all = await services.listGiveaways(interaction.guildId, { limit: 25 });
    const choices = all
      .filter((gw) => (sub === "end" ? !gw.ended : gw.ended))
      .filter((gw) => !query || gw.prize.toLowerCase().includes(query) || shortId(gw.id).startsWith(query))
      .slice(0, 25)
      .map((gw) => ({ name: `${gw.prize.slice(0, 80)} · ${gw.ended ? "ended" : "running"}`, value: gw.id }));
    await interaction.respond(choices);
  },
};

/* ---------- entry button ---------- */

const giveawayButtons: ComponentHandler = {
  customIdPrefix: "gw:",
  async execute(interaction, ctx) {
    if (!interaction.isButton()) return;
    const i = interaction;
    const [, action, id] = i.customId.split(":");
    if (action !== "enter" || !id) return;
    if (!i.guildId) {
      await i.reply(ephemeral("Giveaways only work in servers."));
      return;
    }
    const gw = await services.getGiveaway(id);
    if (!gw || gw.guildId !== i.guildId) {
      await i.reply(ephemeral("That giveaway is gone."));
      return;
    }
    if (gw.ended) {
      await i.reply(ephemeral("That giveaway has ended - better luck next time!"));
      return;
    }
    let result: "entered" | "left";
    try {
      result = await services.toggleGiveawayEntry(id, i.user.id);
    } catch {
      await i.reply(ephemeral("That giveaway just ended."));
      return;
    }
    const count = await services.countGiveawayEntries(id);
    await i.reply(
      ephemeral(
        result === "entered"
          ? `🎉 You're in! **${count}** entr${count === 1 ? "y" : "ies"} so far - good luck!`
          : "👋 You left the giveaway. Changed your mind? Just click again.",
      ),
    );
    refreshCardThrottled(ctx.client, gw, count);
  },
};

/* ---------- auto-end via the scheduler ---------- */

registerTaskHandler("giveaway_end", async (payload, client) => {
  const id = typeof payload.giveawayId === "string" ? payload.giveawayId : null;
  if (!id) return;
  const gw = await services.getGiveaway(id);
  if (!gw || gw.ended) return;
  await finishGiveawayFlow(client, gw);
});

export const giveawaysModule = defineModule({
  id: "giveaways",
  name: "Giveaways",
  version: "0.1.0",
  commands: [giveawayCommand],
  components: [giveawayButtons],
});
