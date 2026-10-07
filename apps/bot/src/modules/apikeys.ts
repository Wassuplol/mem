import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, type AutocompleteInteraction } from "discord.js";
import { defineModule, type SlashCommand } from "@mem/core";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild, ephemeral, requirePermissions } from "../lib/permissions";
import { services } from "../lib/services";

const shortId = (id: string): string => id.slice(0, 8);

const apikeyCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("apikey")
    .setDescription("API keys for the Mem public API (/api/v1).")
    .addSubcommand((s) =>
      s
        .setName("create")
        .setDescription("Create a new API key for this server.")
        .addStringOption((o) =>
          o.setName("name").setDescription("What is it for? (e.g. 'website backend')").setRequired(true).setMaxLength(50),
        ),
    )
    .addSubcommand((s) => s.setName("list").setDescription("List active API keys."))
    .addSubcommand((s) =>
      s
        .setName("revoke")
        .setDescription("Revoke an API key.")
        .addStringOption((o) => o.setName("id").setDescription("Pick a key").setRequired(true).setAutocomplete(true)),
    ),
  async execute(interaction) {
    const i = await ensureGuild(interaction);
    if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
    const sub = i.options.getSubcommand(true);

    if (sub === "create") {
      const name = i.options.getString("name", true).trim();
      const { row, rawKey } = await services.createApiKey({ guildId: i.guild.id, name, createdBy: i.user.id });
      await i.reply({
        embeds: [
          embed({
            color: COLORS.success,
            title: "API key created 🔑",
            description: [
              `**${name}** · id \`${shortId(row.id)}\``,
              "",
              "Copy it now - it is shown **once**:",
              `\`\`\`\n${rawKey}\n\`\`\``,
              "Use it as `Authorization: Bearer <key>` against the Mem public API. " +
                "Interactive docs: dashboard → **API docs**.",
            ].join("\n"),
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === "list") {
      const keys = await services.listApiKeys(i.guild.id);
      if (keys.length === 0) {
        await i.reply(ephemeral("No active API keys - create one with `/apikey create`."));
        return;
      }
      const lines = keys.map((k) => {
        const created = Math.floor(k.createdAt.getTime() / 1_000);
        const used = k.lastUsedAt ? `last used <t:${Math.floor(k.lastUsedAt.getTime() / 1_000)}:R>` : "never used";
        return `\`${shortId(k.id)}\` **${k.name}** · \`${k.keyPrefix}…\` · created <t:${created}:R> · ${used}`;
      });
      await i.reply({
        embeds: [embed({ title: `Active API keys: ${keys.length}`, description: lines.join("\n") })],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // sub === "revoke"
    const id = i.options.getString("id", true);
    const revoked = await services.revokeApiKey(i.guild.id, id);
    await i.reply(
      revoked ? ephemeral("🗑️ Key revoked - it stops working immediately.") : ephemeral("No active key found with that id."),
    );
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId || interaction.options.getSubcommand(true) !== "revoke") {
      await interaction.respond([]);
      return;
    }
    const query = interaction.options.getFocused().trim().toLowerCase();
    const keys = await services.listApiKeys(interaction.guildId);
    const choices = keys
      .filter((k) => !query || k.name.toLowerCase().includes(query) || shortId(k.id).startsWith(query))
      .slice(0, 25)
      .map((k) => ({ name: `${k.name} · ${k.keyPrefix}…`, value: k.id }));
    await interaction.respond(choices);
  },
};

export const apikeysModule = defineModule({
  id: "apikeys",
  name: "API Keys",
  version: "0.1.0",
  commands: [apikeyCommand],
});
