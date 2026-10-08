import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
  type Guild,
  type GuildMember,
} from "discord.js";
import { defineModule } from "@mem/core";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild, ephemeral, requirePermissions, UserError } from "../lib/permissions";
import { services } from "../lib/services";

/* ------------------------------------------------------------------ *
 *  Verification gate — free version of Wick's join gate: a "Verify"
 *  button grants the member role (and strips the unverified/join role).
 * ------------------------------------------------------------------ */

type VerificationConfig = {
  roleId?: string | null;
  removeRoleId?: string | null;
  joinRoleId?: string | null;
  channelId?: string | null;
  messageId?: string | null;
  text?: string | null;
};

async function loadConfig(guildId: string): Promise<VerificationConfig> {
  return (await services.getModuleConfig<VerificationConfig>(guildId, "verification")) ?? {};
}

function panelEmbed(cfg: VerificationConfig): ReturnType<typeof embed> {
  return embed({
    color: COLORS.brand,
    title: "✅ Verification",
    description: cfg.text ?? "Click the button below to verify yourself and unlock the server.",
  }).setFooter({ text: "Powered by Mem" });
}

function panelRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("verify:go").setLabel("Verify").setEmoji("✅").setStyle(ButtonStyle.Success),
  );
}

/** Throws when the role can't be managed by the bot (hierarchy / managed). */
function assertManageableRole(guild: Guild, roleId: string): void {
  const role = guild.roles.cache.get(roleId);
  if (!role) throw new UserError("I can't find that role.");
  if (role.managed) throw new UserError("That role is managed by an integration — pick another.");
  const me = guild.members.me;
  if (me && role.position >= me.roles.highest.position) {
    throw new UserError("That role sits at or above my highest role — move my role up in Server Settings.");
  }
}

export const verificationModule = defineModule({
  id: "verification",
  name: "Verification",
  version: "0.1.0",
  events: [
    {
      name: "guildMemberAdd",
      async execute(member: GuildMember) {
        if (member.user.bot) return;
        const cfg = await loadConfig(member.guild.id).catch(() => null);
        if (!cfg?.joinRoleId) return;
        await member.roles.add(cfg.joinRoleId, "Verification: unverified role").catch(() => undefined);
      },
    },
  ],
  components: [
    {
      customIdPrefix: "verify:",
      async execute(interaction) {
        if (!interaction.isButton() || !interaction.inCachedGuild()) return;
        const cfg = await loadConfig(interaction.guild.id);
        if (!cfg.roleId) {
          await interaction.reply(ephemeral("Verification is not set up yet — ask an admin to run `/verification setup`."));
          return;
        }
        if (interaction.member.roles.cache.has(cfg.roleId)) {
          await interaction.reply(ephemeral("You're already verified ✅"));
          return;
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
          await interaction.member.roles.add(cfg.roleId, "Verified via panel");
        } catch {
          await interaction.editReply("I couldn't give you the role — ask an admin to check my role position. 😔");
          return;
        }
        if (cfg.removeRoleId && interaction.member.roles.cache.has(cfg.removeRoleId)) {
          await interaction.member.roles.remove(cfg.removeRoleId, "Verified via panel").catch(() => undefined);
        }
        if (cfg.joinRoleId && interaction.member.roles.cache.has(cfg.joinRoleId)) {
          await interaction.member.roles.remove(cfg.joinRoleId, "Verified via panel").catch(() => undefined);
        }
        await interaction.editReply("✅ You're verified — welcome in!");
      },
    },
  ],
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("verification")
        .setDescription("Verification gate: members click a button to get their role.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) =>
          s
            .setName("setup")
            .setDescription("Post (or re-post) the verification panel")
            .addRoleOption((o) => o.setName("role").setDescription("Role granted on verify").setRequired(true))
            .addChannelOption((o) => o.setName("channel").setDescription("Channel for the panel (defaults to here)"))
            .addRoleOption((o) => o.setName("remove_role").setDescription("Role removed when they verify (e.g. Unverified)"))
            .addStringOption((o) => o.setName("text").setDescription("Panel text (optional)").setMaxLength(500)),
        )
        .addSubcommand((s) =>
          s
            .setName("joinrole")
            .setDescription("Role auto-given on join (e.g. Unverified)")
            .addRoleOption((o) => o.setName("role").setDescription("Join role (omit to clear)")),
        )
        .addSubcommand((s) => s.setName("off").setDescription("Turn verification off (keeps roles, removes panel config)"))
        .addSubcommand((s) => s.setName("config").setDescription("Show the current verification settings")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
        const cfg = await loadConfig(i.guild.id);
        const sub = i.options.getSubcommand();

        if (sub === "setup") {
          const role = i.options.getRole("role", true);
          const removeRole = i.options.getRole("remove_role");
          const channelOption = i.options.getChannel("channel");
          const text = i.options.getString("text");
          const channel = channelOption ?? i.channel;
          if (!(channel instanceof TextChannel)) throw new UserError("Pick a regular text channel for the panel.");
          assertManageableRole(i.guild, role.id);
          if (removeRole) assertManageableRole(i.guild, removeRole.id);

          const nextText = text ?? cfg.text ?? null;
          const preview = { ...cfg, roleId: role.id, removeRoleId: removeRole?.id ?? null, text: nextText };
          const panel = await channel.send({ embeds: [panelEmbed(preview)], components: [panelRow()] });

          cfg.roleId = role.id;
          cfg.removeRoleId = removeRole?.id ?? null;
          cfg.channelId = channel.id;
          cfg.messageId = panel.id;
          if (nextText) cfg.text = nextText;
          await services.setModuleConfig(i.guild.id, "verification", cfg);

          await i.reply(ephemeral(`✅ Verification panel posted in <#${channel.id}> — members who verify get <@&${role.id}>.`));
          return;
        }

        if (sub === "joinrole") {
          const role = i.options.getRole("role");
          if (role) assertManageableRole(i.guild, role.id);
          cfg.joinRoleId = role?.id ?? null;
          await services.setModuleConfig(i.guild.id, "verification", cfg);
          await i.reply(ephemeral(role ? `New members will automatically get <@&${role.id}> on join.` : "Join role cleared."));
          return;
        }

        if (sub === "off") {
          cfg.roleId = null;
          cfg.removeRoleId = null;
          cfg.channelId = null;
          cfg.messageId = null;
          await services.setModuleConfig(i.guild.id, "verification", cfg);
          await i.reply(ephemeral("⭕ Verification is off — the panel button no longer grants roles. Roles members already have were kept."));
          return;
        }

        // config
        const lines = [
          `Verify role: ${cfg.roleId ? `<@&${cfg.roleId}>` : "*off*"}`,
          `Removed on verify: ${cfg.removeRoleId ? `<@&${cfg.removeRoleId}>` : "*none*"}`,
          `Join role: ${cfg.joinRoleId ? `<@&${cfg.joinRoleId}>` : "*none*"}`,
          `Panel: ${cfg.channelId ? `<#${cfg.channelId}>` : "*not posted — run `/verification setup`*"}`,
        ];
        await i.reply({
          embeds: [embed({ color: COLORS.brand, title: "🚪 Verification settings", description: lines.join("\n") })],
          flags: MessageFlags.Ephemeral,
        });
      },
    },
  ],
});
