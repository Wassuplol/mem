import { ChannelType, GuildMember, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { defineModule } from "@mem/core";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild, requirePermissions } from "../lib/permissions";

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
      data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("Send a message as Mem.")
        .addStringOption((o) => o.setName("message").setDescription("What to say").setRequired(true).setMaxLength(2000))
        .addChannelOption((o) => o.setName("channel").setDescription("Target channel (default: current)")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageMessages))) return;
        const target = i.options.getChannel("channel") ?? i.channel;
        if (!target?.isSendable()) {
          await i.reply({ content: "I cannot send messages in that channel.", flags: 64 });
          return;
        }
        await target.send({ content: i.options.getString("message", true), allowedMentions: { parse: [] } });
        await i.reply({ content: `Sent to <#${target.id}>.`, flags: 64 });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Post an announcement embed.")
        .addChannelOption((o) => o.setName("channel").setDescription("Where to announce").setRequired(true))
        .addStringOption((o) => o.setName("message").setDescription("Announcement body").setRequired(true).setMaxLength(4000))
        .addStringOption((o) => o.setName("title").setDescription("Optional title").setMaxLength(256)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageMessages))) return;
        const channel = i.options.getChannel("channel", true);
        if (!channel.isSendable()) {
          await i.reply({ content: "I cannot send messages in that channel.", flags: 64 });
          return;
        }
        const builder = embed({ color: COLORS.brand, description: i.options.getString("message", true) });
        const title = i.options.getString("title");
        if (title) builder.setTitle(title);
        builder.setFooter({ text: `Announcement by ${i.user.username}` });
        await channel.send({ embeds: [builder], allowedMentions: { parse: [] } });
        await i.reply({ content: `Announcement posted in <#${channel.id}>.`, flags: 64 });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("serverstats")
        .setDescription("Detailed stats for this server (RAM-lean, cached counts)."),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const g = i.guild;
        const channels = g.channels.cache;
        const text = channels.filter((c) => c.type === ChannelType.GuildText).size;
        const voice = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
        const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).size;
        const forums = channels.filter((c) => c.type === ChannelType.GuildForum).size;
        const members = g.members.cache;
        const bots = members.filter((m) => m.user.bot).size;
        const humans = members.size - bots;
        const emojis = g.emojis.cache;
        const animated = emojis.filter((e) => e.animated).size;
        const VERIFICATION = ["None", "Low", "Medium", "High", "Very High"];
        await i.reply({
          embeds: [
            embed({ title: `Stats - ${g.name}` })
              .addFields(
                { name: "Members", value: `${g.memberCount} total\n${humans} cached humans\n${bots} bots`, inline: true },
                { name: "Channels", value: `${text} text - ${voice} voice\n${categories} categories - ${forums} forum`, inline: true },
                { name: "Roles", value: `${g.roles.cache.size}`, inline: true },
                { name: "Emojis", value: `${emojis.size} (${animated} animated)`, inline: true },
                { name: "Boosts", value: `Tier ${g.premiumTier} - ${g.premiumSubscriptionCount ?? 0} boosts`, inline: true },
                { name: "Verification", value: VERIFICATION[g.verificationLevel] ?? "none", inline: true },
              )
              .setFooter({ text: `ID ${g.id} - created <t:${Math.floor(g.createdTimestamp / 1000)}:R>` }),
          ],
        });
      },
    },
  ],
});
