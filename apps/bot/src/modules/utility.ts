import { GuildMember, SlashCommandBuilder } from "discord.js";
import { defineModule } from "@mem/core";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild } from "../lib/permissions";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d > 0 ? `${d}d` : null, `${h}h`, `${m}m`, `${s}s`].filter(Boolean).join(" ");
}

export const utilityModule = defineModule({
  id: "utility",
  name: "Utility",
  version: "0.0.1",
  commands: [
    {
      data: new SlashCommandBuilder().setName("serverinfo").setDescription("Show information about this server."),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const guild = i.guild;
        const builder = embed({
          title: guild.name,
          description: `**ID:** \`${guild.id}\``,
        }).addFields(
          { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
          { name: "Members", value: `${guild.memberCount}`, inline: true },
          { name: "Channels", value: `${guild.channels.cache.size}`, inline: true },
          { name: "Roles", value: `${guild.roles.cache.size}`, inline: true },
          { name: "Boosts", value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
          { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        );
        const icon = guild.iconURL({ size: 128 });
        if (icon) builder.setThumbnail(icon);
        await i.reply({ embeds: [builder] });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Show information about a user.")
        .addUserOption((o) => o.setName("user").setDescription("User (default: you)")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const user = i.options.getUser("user") ?? i.user;
        let member = i.options.getMember("user");
        if (!member) member = await i.guild.members.fetch(user.id).catch(() => null);

        const roles =
          member && member.roles.cache.size > 1
            ? member.roles.cache
                .filter((r) => r.id !== i.guild.id)
                .map((r) => r.toString())
                .slice(0, 15)
                .join(" ")
            : "-";

        const builder = embed({ title: user.username, description: `<@${user.id}>` }).addFields(
          { name: "ID", value: `\`${user.id}\``, inline: true },
          { name: "Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
          {
            name: "Joined",
            value: member?.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : "unknown",
            inline: true,
          },
          { name: "Nickname", value: member?.nickname ?? "-", inline: true },
          { name: "Roles", value: roles },
        );
        builder.setThumbnail(user.displayAvatarURL({ size: 128 }));
        await i.reply({ embeds: [builder] });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Show a user's avatar.")
        .addUserOption((o) => o.setName("user").setDescription("User (default: you)")),
      async execute(interaction) {
        const user = interaction.options.getUser("user") ?? interaction.user;
        const maybeMember = interaction.options.getMember("user");
        const member = maybeMember instanceof GuildMember ? maybeMember : null;
        const url = member?.avatar ? member.displayAvatarURL({ size: 1024 }) : user.displayAvatarURL({ size: 1024 });
        await interaction.reply({
          embeds: [embed({ title: `${user.username}'s avatar`, description: `[Open](${url})` }).setImage(url)],
        });
      },
    },
    {
      data: new SlashCommandBuilder().setName("membercount").setDescription("Count the humans of this server."),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const guild = i.guild;
        const cachedHumans = guild.members.cache.filter((m) => !m.user.bot).size;
        await i.reply({
          embeds: [
            embed({
              description: `**${guild.name}** has **${guild.memberCount}** members (${cachedHumans} cached non-bots).`,
            }),
          ],
        });
      },
    },
    {
      data: new SlashCommandBuilder().setName("servericon").setDescription("Show this server's icon."),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const icon = i.guild.iconURL({ size: 1024 });
        if (!icon) {
          await i.reply({ content: "This server has no icon.", flags: 64 });
          return;
        }
        await i.reply({ embeds: [embed({ title: i.guild.name, description: `[Open](${icon})` }).setImage(icon)] });
      },
    },
    {
      data: new SlashCommandBuilder().setName("botinfo").setDescription("Mem's status: uptime, memory, latency."),
      async execute(interaction) {
        const mem = process.memoryUsage();
        const toMb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
        await interaction.reply({
          embeds: [
            embed({ title: "Mem - status" }).addFields(
              { name: "Uptime", value: formatUptime(process.uptime()), inline: true },
              { name: "Gateway ping", value: `${Math.max(0, Math.round(interaction.client.ws.ping))} ms`, inline: true },
              { name: "Guilds", value: `${interaction.client.guilds.cache.size}`, inline: true },
              { name: "Memory (RSS)", value: `${toMb(mem.rss)} MB`, inline: true },
              { name: "Heap used", value: `${toMb(mem.heapUsed)} MB`, inline: true },
              { name: "Node", value: process.version, inline: true },
            ),
          ],
        });
      },
    },
    {
      data: new SlashCommandBuilder().setName("help").setDescription("List every Mem command."),
      async execute(interaction) {
        const { registry } = await import("../registry");
        const fields = registry.list().map((feature) => ({
          name: `${feature.name}`,
          value: (feature.commands ?? []).map((c) => `\`/${c.data.name}\``).join(" ") || "-",
        }));
        await interaction.reply({
          embeds: [
            embed({
              title: "Mem - commands",
              description: `${registry.commands().length} commands across ${registry.list().length} modules.`,
            }).addFields(fields),
          ],
        });
      },
    },
  ],
});
