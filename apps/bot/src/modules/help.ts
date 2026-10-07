import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type AnySelectMenuInteraction,
  type ButtonInteraction,
} from "discord.js";
import {
  defineModule,
  type ComponentHandler,
  type ComponentInteraction,
  type ModuleContext,
  type SlashCommand,
} from "@mem/core";
import { COLORS, embed } from "../lib/embed";

const PAGE_SIZE = 8;
const CLOSE_TEXT = "Help closed - run /help again anytime.";

interface CommandEntry {
  name: string;
  description: string;
  moduleId: string;
  moduleName: string;
}

interface HelpView {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[];
}

function entries(ctx: ModuleContext): CommandEntry[] {
  return ctx.registry.list().flatMap((feature) =>
    (feature.commands ?? []).map((command) => ({
      name: command.data.name,
      description: command.data.description,
      moduleId: feature.id,
      moduleName: feature.name,
    })),
  );
}

/** scope = "all" or a module id. */
function view(ctx: ModuleContext, scope: string, page: number): HelpView {
  const all = entries(ctx);
  const scoped = scope === "all" ? all : all.filter((entry) => entry.moduleId === scope);
  const totalPages = Math.max(1, Math.ceil(scoped.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = scoped.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const title =
    scope === "all" ? "Mem - command center" : `${all.find((e) => e.moduleId === scope)?.moduleName ?? scope} - commands`;

  const builder = embed({
    title,
    description:
      scope === "all"
        ? `${all.length} command(s) across ${ctx.registry.list().length} modules. Type in the search box above, or browse below.`
        : undefined,
    color: COLORS.brand,
  });
  if (slice.length > 0) {
    builder.addFields(
      slice.map((entry) => ({
        name: `/${entry.name}`,
        value: entry.description + (scope === "all" ? ` *(in ${entry.moduleName})*` : ""),
      })),
    );
  }
  if (totalPages > 1) builder.setFooter({ text: `Page ${safePage + 1} / ${totalPages}` });

  const select = new StringSelectMenuBuilder()
    .setCustomId("help:cat")
    .setPlaceholder("Browse a category...")
    .addOptions(
      { label: "All commands", value: "all", default: scope === "all" },
      ...ctx.registry.list().slice(0, 24).map((feature) => ({
        label: feature.name,
        value: feature.id,
        description: `${(feature.commands ?? []).length} command(s)`,
        default: scope === feature.id,
      })),
    );

  const prev = new ButtonBuilder()
    .setCustomId(`help:page:${scope}:${safePage - 1}`)
    .setLabel("< Prev")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(safePage <= 0);
  const next = new ButtonBuilder()
    .setCustomId(`help:page:${scope}:${safePage + 1}`)
    .setLabel("Next >")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(safePage >= totalPages - 1);
  const home = new ButtonBuilder()
    .setCustomId("help:home")
    .setLabel("Menu")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(scope === "all" && safePage === 0);
  const close = new ButtonBuilder().setCustomId("help:close").setLabel("Close").setStyle(ButtonStyle.Danger);

  return {
    embeds: [builder],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      new ActionRowBuilder<ButtonBuilder>().addComponents(prev, next, home, close),
    ],
  };
}

async function show(
  interaction: ButtonInteraction | AnySelectMenuInteraction,
  ctx: ModuleContext,
  scope: string,
  page: number,
): Promise<void> {
  await interaction.update(view(ctx, scope, page));
}

const helpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Find any Mem command: browse categories or type to search.")
    .addStringOption((o) =>
      o.setName("query").setDescription("Type to search command names and descriptions...").setAutocomplete(true),
    ),
  async autocomplete(interaction, ctx) {
    const query = interaction.options.getFocused().toLowerCase();
    const matches = entries(ctx)
      .filter((e) => e.name.toLowerCase().includes(query) || e.description.toLowerCase().includes(query))
      .slice(0, 25)
      .map((e) => ({ name: `/${e.name} - ${e.moduleName}`.slice(0, 100), value: e.name }));
    await interaction.respond(matches);
  },
  async execute(interaction, ctx) {
    const query = interaction.options.getString("query");
    if (query) {
      const q = query.toLowerCase();
      const matches = entries(ctx).filter(
        (e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
      );
      if (matches.length === 0) {
        await interaction.reply({ content: `No commands match "${query}".`, flags: MessageFlags.Ephemeral });
        return;
      }
      const results = embed({
        title: `Search: ${query}`,
        description: matches
          .slice(0, 25)
          .map((e) => `**/${e.name}** - ${e.description} *(in ${e.moduleName})*`)
          .join("\n"),
      });
      await interaction.reply({ embeds: [results], flags: MessageFlags.Ephemeral });
      return;
    }
    const initial = view(ctx, "all", 0);
    await interaction.reply({ embeds: initial.embeds, components: initial.components, flags: MessageFlags.Ephemeral });
  },
};

const helpComponents: ComponentHandler = {
  customIdPrefix: "help:",
  async execute(interaction: ComponentInteraction, ctx: ModuleContext) {
    if (interaction.customId === "help:cat") {
      if (!interaction.isStringSelectMenu()) return;
      await show(interaction, ctx, interaction.values[0] ?? "all", 0);
      return;
    }
    if (!interaction.isButton()) return;
    if (interaction.customId === "help:close") {
      await interaction.update({
        embeds: [embed({ color: COLORS.neutral, description: CLOSE_TEXT })],
        components: [],
      });
      return;
    }
    if (interaction.customId === "help:home") {
      await show(interaction, ctx, "all", 0);
      return;
    }
    const parts = interaction.customId.split(":");
    if (parts[1] === "page") {
      const scope = parts[2] ?? "all";
      const page = Number.parseInt(parts[3] ?? "0", 10);
      await show(interaction, ctx, scope, Number.isFinite(page) ? page : 0);
    }
  },
};

export const helpModule = defineModule({
  id: "help",
  name: "Help & Discovery",
  version: "0.0.1",
  commands: [helpCommand],
  components: [helpComponents],
});
