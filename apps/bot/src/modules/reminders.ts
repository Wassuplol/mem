import { Events, MessageFlags, SlashCommandBuilder, type AutocompleteInteraction, type Client } from "discord.js";
import { defineModule, type SlashCommand } from "@mem/core";
import { embed } from "../lib/embed";
import { ensureGuild, ephemeral, UserError } from "../lib/permissions";
import { services } from "../lib/services";

const SCAN_INTERVAL_MS = 30_000;
const SCAN_BATCH = 25;
const PURGE_EVERY_TICKS = 120; // ~1 hour
const SENT_RETENTION_DAYS = 30;
const MAX_PENDING_PER_USER = 10;
const MIN_AHEAD_MS = 10_000;
const MAX_AHEAD_MS = 365 * 86_400_000;

const UNIT_MS: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

/** "1d2h30m" -> milliseconds; null when the whole string is not duration parts. */
function parseDuration(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!text) return null;
  let total = 0;
  let consumed = 0;
  for (const match of text.matchAll(/(\d+)([smhdw])/g)) {
    consumed += match[0].length;
    total += Number(match[1]) * (UNIT_MS[match[2] ?? ""] ?? 0);
  }
  return consumed === text.length && total > 0 ? total : null;
}

const shortId = (id: string): string => id.slice(0, 8);

/** Compact "in 2h 30m" text for autocomplete names (timestamps do not render there). */
function fmtAhead(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return mins % 60 === 0 ? `${hours}h` : `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

const truncate = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

const reminderCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription("Reminders: Mem pings you at the moment you pick.")
    .addSubcommand((s) =>
      s
        .setName("set")
        .setDescription("Set a reminder, counted from now (e.g. 10m, 1h30m, 2d).")
        .addStringOption((o) => o.setName("when").setDescription("How far ahead: 10m, 1h30m, 2d...").setRequired(true))
        .addStringOption((o) =>
          o.setName("what").setDescription("What should I remind you about?").setRequired(true).setMaxLength(500),
        ),
    )
    .addSubcommand((s) => s.setName("list").setDescription("Your pending reminders in this server."))
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Cancel one of your pending reminders.")
        .addStringOption((o) =>
          o.setName("id").setDescription("Pick a reminder (type to search)").setRequired(true).setAutocomplete(true),
        ),
    ),
  async execute(interaction) {
    const i = await ensureGuild(interaction);
    const sub = i.options.getSubcommand(true);

    if (sub === "set") {
      const duration = parseDuration(i.options.getString("when", true));
      if (duration === null) throw new UserError("Could not read that time - try `10m`, `1h30m` or `2d`.");
      if (duration < MIN_AHEAD_MS) throw new UserError("Give me at least 10 seconds notice!");
      if (duration > MAX_AHEAD_MS) throw new UserError("That is more than a year away - the max is 365 days.");

      const what = i.options.getString("what", true).trim();
      if (!what) throw new UserError("Tell me what to remind you about.");

      const pending = await services.countUserReminders(i.guild.id, i.user.id);
      if (pending >= MAX_PENDING_PER_USER) {
        throw new UserError(
          `You already have ${MAX_PENDING_PER_USER} pending reminders here - cancel one with \`/reminder remove\` first.`,
        );
      }

      const remindAt = new Date(Date.now() + duration);
      const reminder = await services.createReminder({
        guildId: i.guild.id,
        channelId: i.channelId,
        userId: i.user.id,
        message: truncate(what, 500),
        remindAt,
      });
      const stamp = Math.floor(remindAt.getTime() / 1000);
      await i.reply(
        ephemeral(
          `⏰ Reminder set for <t:${stamp}:F> (<t:${stamp}:R>) in <#${i.channelId}> - id \`${shortId(reminder.id)}\`.`,
        ),
      );
      return;
    }

    if (sub === "list") {
      const mine = await services.listUserReminders(i.guild.id, i.user.id, 10);
      if (mine.length === 0) {
        await i.reply(ephemeral("You have no pending reminders here - set one with `/reminder set`."));
        return;
      }
      const lines = mine.map((r) => {
        const stamp = Math.floor(r.remindAt.getTime() / 1000);
        return `⏰ <t:${stamp}:R> (<t:${stamp}:f>) · \`${shortId(r.id)}\` · ${truncate(r.message, 80)}`;
      });
      await i.reply({
        embeds: [embed({ title: `Pending reminders: ${mine.length}`, description: lines.join("\n") })],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // sub === "remove"
    const removed = await services.deleteUserReminder(i.options.getString("id", true), i.user.id);
    await i.reply(
      removed
        ? ephemeral("Done - that reminder is cancelled. 🫡")
        : ephemeral("No pending reminder found with that id. It may have already fired."),
    );
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId || interaction.options.getSubcommand(true) !== "remove") {
      await interaction.respond([]);
      return;
    }
    const query = interaction.options.getFocused().trim().toLowerCase();
    const mine = await services.listUserReminders(interaction.guildId, interaction.user.id, 25);
    const now = Date.now();
    const choices = mine
      .filter((r) => !query || r.message.toLowerCase().includes(query) || shortId(r.id).startsWith(query))
      .slice(0, 25)
      .map((r) => ({ name: truncate(`${fmtAhead(r.remindAt.getTime() - now)} · ${r.message}`, 100), value: r.id }));
    await interaction.respond(choices);
  },
};

/* ---------- delivery scan: one interval, bounded batch, nothing cached ---------- */

let scanTimer: ReturnType<typeof setInterval> | null = null;
let ticks = 0;

async function deliverDue(client: Client): Promise<void> {
  try {
    const due = await services.listDueReminders(SCAN_BATCH);
    for (const reminder of due) {
      const payload = {
        content: `⏰ <@${reminder.userId}> ${reminder.message}`,
        allowedMentions: { users: [reminder.userId] },
      };
      let delivered = false;
      try {
        const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
        if (channel?.isSendable()) {
          await channel.send(payload);
          delivered = true;
        }
      } catch (error) {
        console.warn("[mem] reminder: channel delivery failed:", error);
      }
      if (!delivered) {
        try {
          const user = await client.users.fetch(reminder.userId);
          await user.send(payload);
        } catch (error) {
          console.warn("[mem] reminder: DM fallback failed too - dropping reminder", reminder.id, error);
        }
      }
      // Marked sent even after a failed delivery: a dead channel must not make the scan retry forever.
      await services.markReminderSent(reminder.id);
    }
  } catch (error) {
    console.error("[mem] reminder scan failed:", error);
  }
}

function startScan(client: Client): void {
  if (scanTimer) return;
  void deliverDue(client); // catch anything that came due while the bot was offline
  scanTimer = setInterval(() => {
    void deliverDue(client);
    if (++ticks % PURGE_EVERY_TICKS === 0) {
      void services
        .purgeSentReminders(SENT_RETENTION_DAYS)
        .catch((error) => console.warn("[mem] reminder purge failed:", error));
    }
  }, SCAN_INTERVAL_MS);
  console.log(`[mem] reminders: scan every ${SCAN_INTERVAL_MS / 1000}s (batch ${SCAN_BATCH})`);
}

export const remindersModule = defineModule({
  id: "reminders",
  name: "Reminders",
  version: "0.0.1",
  commands: [reminderCommand],
  events: [
    {
      name: Events.ClientReady,
      once: true,
      execute(client) {
        startScan(client);
      },
    },
  ],
});
