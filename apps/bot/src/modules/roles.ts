import {
  ActionRowBuilder,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";
import { defineModule, type ComponentHandler, type ComponentInteraction, type SlashCommand } from "@mem/core";
import type { RolePanel, RolePanelEntry } from "@mem/db";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild, ephemeral, UserError } from "../lib/permissions";
import { services } from "../lib/services";

/** One select menu per panel; entries past 25 need a second panel (v1 cap). */
const MAX_ENTRIES = 25;

const truncate = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

const CUSTOM_EMOJI = /^<a?:([^:]+):(\d{17,20})>$/;
const NAMED_EMOJI = /^:([a-zA-Z0-9_]{2,32}):$/;

/** Convert a stored emoji (unicode or `<a?:name:id>`) into something setEmoji accepts. */
function emojiResolvable(stored: string): string | { id: string } {
  const match = stored.match(CUSTOM_EMOJI);
  return match ? { id: match[2]! } : stored;
}

/** Shared renderer: the panel embed + the toggle select menu. */
function renderPanel(
  panel: RolePanel,
  entries: RolePanelEntry[],
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<StringSelectMenuBuilder>[] } {
  const description =
    entries.length === 0
      ? "*No roles yet.* An admin can add some with `/reactionrole add`."
      : entries.map((entry) => `${entry.emoji ? `${entry.emoji} ` : ""}<@&${entry.roleId}>`).join("\n");

  const builder = embed({
    title: `🎭 ${truncate(panel.title, 240)}`,
    description: `${panel.description ? `${truncate(panel.description, 1500)}\n\n` : ""}${description}`,
    color: COLORS.brand,
  });
  builder.setFooter({
    text: `${entries.length} role(s) · pick in the menu to get a role, unselect to drop it`,
  });

  if (entries.length === 0) return { embeds: [builder], components: [] };

  const select = new StringSelectMenuBuilder()
    .setCustomId(`rrole:toggle:${panel.id}`)
    .setPlaceholder("Choose your roles")
    .setMinValues(0)
    .setMaxValues(entries.length)
    .addOptions(
      entries.map((entry) => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(truncate(entry.label, 100))
          .setValue(entry.roleId);
        if (entry.emoji) {
          try {
            option.setEmoji(emojiResolvable(entry.emoji));
          } catch {
            /* stored emoji no longer valid (e.g. deleted emoji) - render without it */
          }
        }
        return option;
      }),
    );

  return { embeds: [builder], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)] };
}

/** Repaint a panel message after its entries changed. */
async function repaintPanel(client: ChatInputCommandInteraction["client"], panel: RolePanel): Promise<void> {
  const entries = await services.listRolePanelEntries(panel.id);
  const channel = await client.channels.fetch(panel.channelId);
  if (!channel?.isTextBased()) throw new Error("Panel channel not available");
  const message = await channel.messages.fetch(panel.messageId);
  const rendered = renderPanel(panel, entries);
  await message.edit({ embeds: rendered.embeds, components: rendered.components });
}

/** Resolve the target panel: explicit message ID/link, or the guild's latest panel. */
async function resolvePanel(guildId: string, raw?: string | null): Promise<RolePanel> {
  if (raw) {
    const messageId = raw.trim().split("/").filter(Boolean).pop() ?? raw.trim();
    if (!/^\d{17,20}$/.test(messageId)) throw new UserError("That does not look like a message ID or link.");
    const panel = await services.getRolePanelByMessage(messageId);
    if (!panel) throw new UserError("No role panel is attached to that message.");
    return panel;
  }
  const latest = await services.getLatestRolePanel(guildId);
  if (!latest) throw new UserError("No role panels in this server yet - create one with `/reactionrole create`.");
  return latest;
}

/** Normalize an emoji argument to what we store (`<a?:name:id>` or unicode). */
function normalizeEmoji(i: ChatInputCommandInteraction<"cached">, raw: string | null): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;
  if (CUSTOM_EMOJI.test(text)) return text;
  const named = text.match(NAMED_EMOJI);
  if (named) {
    const found = i.guild.emojis.cache.find((emoji) => emoji.name === named[1]);
    if (!found) throw new UserError(`This server has no custom emoji named ${text}.`);
    return `<${found.animated ? "a" : ""}:${found.name}:${found.id}>`;
  }
  return text;
}

/** Guard: the bot must be able to actually grant/remove the role. */
function assertAssignable(i: ChatInputCommandInteraction<"cached">, roleId: string): void {
  if (roleId === i.guild.id) throw new UserError("The @everyone role cannot be self-assigned.");
  const role = i.guild.roles.cache.get(roleId);
  if (!role) throw new UserError("That role does not exist in this server.");
  if (role.managed) throw new UserError("That role is managed by an integration and cannot be self-assigned.");
  const me = i.guild.members.me;
  if (me && role.position >= me.roles.highest.position) {
    throw new UserError("That role sits at or above my highest role - move my role higher in Server Settings > Roles.");
  }
}

async function onToggle(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply(ephemeral("Role panels only work inside a server."));
    return;
  }
  const panelId = interaction.customId.split(":")[2];
  const panel = panelId ? await services.getRolePanel(panelId) : null;
  if (!panel || panel.guildId !== interaction.guildId) {
    await interaction.reply(ephemeral("This role panel no longer exists."));
    return;
  }

  const entries = await services.listRolePanelEntries(panel.id);
  if (entries.length === 0) {
    await interaction.reply(ephemeral("This panel has no roles configured yet."));
    return;
  }

  const selected = new Set(interaction.values);
  const memberRoleIds = new Set(interaction.member.roles.cache.keys());
  const me = interaction.guild.members.me ?? (await interaction.guild.members.fetchMe());
  const added: string[] = [];
  const removed: string[] = [];
  const failed: string[] = [];

  for (const entry of entries) {
    const wants = selected.has(entry.roleId);
    const has = memberRoleIds.has(entry.roleId);
    if (wants === has) continue;

    const role = interaction.guild.roles.cache.get(entry.roleId);
    if (!role || role.managed || role.position >= me.roles.highest.position) {
      failed.push(`<@&${entry.roleId}>`);
      continue;
    }
    try {
      if (wants) {
        await interaction.guild.members.addRole({ user: interaction.user.id, role: role.id, reason: "reaction role" });
        added.push(`<@&${role.id}>`);
      } else {
        await interaction.guild.members.removeRole({
          user: interaction.user.id,
          role: role.id,
          reason: "reaction role",
        });
        removed.push(`<@&${role.id}>`);
      }
    } catch {
      failed.push(`<@&${role.id}>`);
    }
  }

  const parts: string[] = [];
  if (added.length > 0) parts.push(`✅ Added: ${added.join(", ")}`);
  if (removed.length > 0) parts.push(`🗑️ Removed: ${removed.join(", ")}`);
  if (failed.length > 0) parts.push(`⚠️ Could not update: ${failed.join(", ")} (check my role position)`);
  if (parts.length === 0) parts.push("Nothing changed - you already had exactly those roles.");

  await interaction.reply(ephemeral(parts.join("\n")));
}

const reactionRoleCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Self-assignable role panels: create, add, remove, list.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) =>
      s
        .setName("create")
        .setDescription("Post a new role panel (a message with a role picker).")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Where to post the panel")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        )
        .addStringOption((o) => o.setName("title").setDescription("Panel title").setMaxLength(256).setRequired(true))
        .addStringOption((o) =>
          o.setName("description").setDescription("Optional intro text above the roles").setMaxLength(1500),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Add a role option to a panel.")
        .addRoleOption((o) => o.setName("role").setDescription("The role members can give themselves").setRequired(true))
        .addStringOption((o) => o.setName("emoji").setDescription("Emoji for the option (unicode or :name:)"))
        .addStringOption((o) => o.setName("label").setDescription("Menu label (defaults to the role name)"))
        .addStringOption((o) => o.setName("message").setDescription("Panel message ID/link (defaults to the latest)")),
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Remove a role option from a panel.")
        .addRoleOption((o) => o.setName("role").setDescription("The role to remove from the panel").setRequired(true))
        .addStringOption((o) => o.setName("message").setDescription("Panel message ID/link (defaults to the latest)")),
    )
    .addSubcommand((s) => s.setName("list").setDescription("List role panels in this server.")),
  async execute(interaction) {
    const i = await ensureGuild(interaction);
    const sub = i.options.getSubcommand(true);

    if (sub === "create") {
      const channel = i.options.getChannel("channel", true);
      const title = i.options.getString("title", true).trim();
      const description = i.options.getString("description")?.trim() || null;

      await i.deferReply({ flags: MessageFlags.Ephemeral });

      const target = await i.client.channels.fetch(channel.id);
      if (!target || !target.isTextBased() || !target.isSendable()) {
        throw new UserError("I cannot post in that channel.");
      }

      const placeholder: RolePanel = {
        id: "new",
        guildId: i.guild.id,
        channelId: channel.id,
        messageId: "",
        title: title.slice(0, 256),
        description,
        createdAt: new Date(),
      };
      const message = await target
        .send(renderPanel(placeholder, []))
        .catch(() => null);
      if (!message) {
        throw new UserError("I could not post there - check my Send Messages + Embed Links permissions in that channel.");
      }

      const panel = await services.createRolePanel({
        guildId: i.guild.id,
        channelId: channel.id,
        messageId: message.id,
        title: title.slice(0, 256),
        description,
      });
      // Re-render with the real panel id in the select customId.
      try {
        const rendered = renderPanel(panel, []);
        await message.edit({ embeds: rendered.embeds, components: rendered.components });
      } catch (error) {
        console.warn("[mem] reactionrole create: repaint failed:", error);
      }

      await i.editReply({
        content: `🎭 Panel created in <#${channel.id}>: ${message.url}\nAdd roles with \`/reactionrole add\`.`,
      });
      return;
    }

    if (sub === "add") {
      const role = i.options.getRole("role", true);
      const emoji = normalizeEmoji(i, i.options.getString("emoji"));
      const label = i.options.getString("label")?.trim();
      const panel = await resolvePanel(i.guild.id, i.options.getString("message"));

      assertAssignable(i, role.id);

      const existing = await services.listRolePanelEntries(panel.id);
      if (!existing.some((entry) => entry.roleId === role.id) && existing.length >= MAX_ENTRIES) {
        throw new UserError(`This panel already has ${MAX_ENTRIES} roles - the select menu limit.`);
      }

      await services.addRolePanelEntry({
        panelId: panel.id,
        roleId: role.id,
        emoji,
        label: label && label.length > 0 ? label.slice(0, 100) : role.name.slice(0, 100),
      });

      try {
        await repaintPanel(i.client, panel);
      } catch (error) {
        console.warn("[mem] reactionrole add: repaint failed:", error);
        throw new UserError("Saved, but I could not repaint the panel message (was it deleted?).");
      }
      await i.reply(ephemeral(`✅ ${role.toString()} added to the panel.`));
      return;
    }

    if (sub === "remove") {
      const role = i.options.getRole("role", true);
      const panel = await resolvePanel(i.guild.id, i.options.getString("message"));

      const gone = await services.removeRolePanelEntry(panel.id, role.id);
      if (!gone) throw new UserError("That role is not on the panel.");

      try {
        await repaintPanel(i.client, panel);
      } catch (error) {
        console.warn("[mem] reactionrole remove: repaint failed:", error);
        throw new UserError("Removed, but I could not repaint the panel message (was it deleted?).");
      }
      await i.reply(ephemeral(`🗑️ ${role.toString()} removed from the panel.`));
      return;
    }

    if (sub === "list") {
      const panels = await services.listRolePanels(i.guild.id, 10);
      if (panels.length === 0) {
        await i.reply({ embeds: [embed({ color: COLORS.neutral, description: "No role panels yet. Create one with `/reactionrole create`." })] });
        return;
      }
      const lines: string[] = [];
      for (const panel of panels) {
        const count = await services.countRolePanelEntries(panel.id);
        const link = `https://discord.com/channels/${panel.guildId}/${panel.channelId}/${panel.messageId}`;
        lines.push(`🎭 [${truncate(panel.title, 60)}](${link}) · ${count} role(s)`);
      }
      await i.reply({ embeds: [embed({ title: `Role panels: ${panels.length}`, description: lines.join("\n") })] });
    }
  },
};

const reactionRoleComponents: ComponentHandler = {
  customIdPrefix: "rrole:",
  async execute(interaction: ComponentInteraction, _ctx) {
    const parts = interaction.customId.split(":");
    if (parts[1] === "toggle" && interaction.isStringSelectMenu()) {
      await onToggle(interaction);
    }
  },
};

export const rolesModule = defineModule({
  id: "roles",
  name: "Reaction roles",
  version: "0.0.1",
  commands: [reactionRoleCommand],
  components: [reactionRoleComponents],
});
