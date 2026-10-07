import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, type AutocompleteInteraction } from "discord.js";
import { defineModule, type SlashCommand } from "@mem/core";
import { COLORS, embed } from "../lib/embed";
import { formatDuration, parseDuration } from "../lib/duration";
import { ensureGuild, ephemeral, requirePermissions, UserError } from "../lib/permissions";
import { services } from "../lib/services";
import { registerTaskHandler } from "../lib/scheduler";

const MIN_MS = 60_000;
const MAX_MS = 365 * 86_400_000;
const shortId = (id: string): string => id.slice(0, 8);

const temproleCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("temprole")
    .setDescription("Temporary roles: granted now, removed automatically.")
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Give a role for a limited time.")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        .addRoleOption((o) => o.setName("role").setDescription("Role to grant").setRequired(true))
        .addStringOption((o) => o.setName("duration").setDescription("How long: 30m, 12h, 7d...").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("list")
        .setDescription("Active temp roles in this server.")
        .addUserOption((o) => o.setName("user").setDescription("Filter by member")),
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Remove a temp role early.")
        .addStringOption((o) => o.setName("id").setDescription("Pick a temp role").setRequired(true).setAutocomplete(true)),
    ),
  async execute(interaction) {
    const i = await ensureGuild(interaction);
    const sub = i.options.getSubcommand(true);

    if (sub === "add") {
      if (!(await requirePermissions(i, PermissionFlagsBits.ManageRoles))) return;
      const member = i.options.getMember("user");
      if (!member) throw new UserError("That user is not a member of this server.");
      const role = i.options.getRole("role", true);
      if (role.id === i.guild.id) throw new UserError("The @everyone role cannot be assigned.");
      if (role.managed) throw new UserError("That role is managed by an integration - assign it from the integration instead.");
      const myTop = i.guild.members.me?.roles.highest.position ?? 0;
      if (role.position >= myTop) {
        throw new UserError("That role sits at or above my highest role. Move my role higher in Server Roles.");
      }
      const durMs = parseDuration(i.options.getString("duration", true));
      if (durMs === null) throw new UserError("Could not read that duration - try `30m`, `12h` or `7d`.");
      if (durMs < MIN_MS) throw new UserError("Minimum temp-role duration is 1 minute.");
      if (durMs > MAX_MS) throw new UserError("Maximum temp-role duration is 365 days.");
      try {
        await member.roles.add(role, `Temp role (${formatDuration(durMs)}) by ${i.user.tag}`);
      } catch {
        throw new UserError("Discord rejected the change - check my Manage Roles permission and hierarchy.");
      }
      const expiresAt = new Date(Date.now() + durMs);
      const task = await services.scheduleTask({ guildId: i.guild.id, kind: "temprole_remove", payload: {}, runAt: expiresAt });
      const row = await services.createTempRole({
        guildId: i.guild.id,
        userId: member.id,
        roleId: role.id,
        taskId: task.id,
        expiresAt,
      });
      await services.setTaskPayload(task.id, { tempRoleId: row.id });
      const stamp = Math.floor(expiresAt.getTime() / 1_000);
      await i.reply({
        embeds: [
          embed({
            color: COLORS.success,
            description: `Gave ${role} to ${member} for **${formatDuration(durMs)}** - auto-removed <t:${stamp}:R>. id \`${shortId(row.id)}\``,
          }),
        ],
      });
      return;
    }

    if (sub === "list") {
      const user = i.options.getUser("user");
      const rows = await services.listTempRoles(i.guild.id, { userId: user?.id, limit: 25 });
      if (rows.length === 0) {
        await i.reply(ephemeral("No active temp roles."));
        return;
      }
      const lines = rows.map((r) => {
        const stamp = Math.floor(r.expiresAt.getTime() / 1_000);
        return `\`${shortId(r.id)}\` <@${r.userId}> · <@&${r.roleId}> · expires <t:${stamp}:R>`;
      });
      await i.reply({
        embeds: [embed({ title: `Active temp roles: ${rows.length}`, description: lines.join("\n") })],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // sub === "remove"
    if (!(await requirePermissions(i, PermissionFlagsBits.ManageRoles))) return;
    const id = i.options.getString("id", true);
    const row = await services.getTempRole(id);
    if (!row || row.guildId !== i.guild.id) throw new UserError("No temp role found with that id.");
    await services.cancelTask(row.taskId);
    await services.removeTempRole(row.id);
    const member = await i.guild.members.fetch(row.userId).catch(() => null);
    let note = "";
    if (member) {
      try {
        await member.roles.remove(row.roleId, `Temp role removed early by ${i.user.tag}`);
      } catch {
        note = " (I could not remove the role itself - check my hierarchy.)";
      }
    } else {
      note = " (They already left the server.)";
    }
    await i.reply({ embeds: [embed({ color: COLORS.success, description: `Temp role cancelled.${note}` })] });
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId || interaction.options.getSubcommand(true) !== "remove") {
      await interaction.respond([]);
      return;
    }
    const query = interaction.options.getFocused().trim().toLowerCase();
    const rows = await services.listTempRoles(interaction.guildId, { limit: 25 });
    const choices = rows
      .filter((r) => !query || shortId(r.id).startsWith(query) || r.roleId.includes(query) || r.userId.includes(query))
      .slice(0, 25)
      .map((r) => {
        const roleName = interaction.guild?.roles.cache.get(r.roleId)?.name ?? `role ${r.roleId.slice(-6)}`;
        return { name: `${shortId(r.id)} · ${roleName} · user ${r.userId.slice(-6)}`, value: r.id };
      });
    await interaction.respond(choices);
  },
};

registerTaskHandler("temprole_remove", async (payload, client) => {
  const id = typeof payload.tempRoleId === "string" ? payload.tempRoleId : null;
  if (!id) return;
  const row = await services.getTempRole(id);
  if (!row) return;
  try {
    const guild = await client.guilds.fetch(row.guildId).catch(() => null);
    const member = guild ? await guild.members.fetch(row.userId).catch(() => null) : null;
    if (member) await member.roles.remove(row.roleId, "Temp role expired").catch(() => undefined);
  } finally {
    await services.removeTempRole(id);
  }
});

export const temprolesModule = defineModule({
  id: "temproles",
  name: "Temp Roles",
  version: "0.1.0",
  commands: [temproleCommand],
});
