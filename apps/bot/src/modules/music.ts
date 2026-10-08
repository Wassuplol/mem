import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type Client,
  type VoiceState,
} from "discord.js";
import { LavalinkManager, type Player, type Track, type UnresolvedTrack } from "lavalink-client";
import { defineModule } from "@mem/core";
import { COLORS, embed, type EmbedBuilder } from "../lib/embed";
import { ensureGuild, ephemeral, UserError } from "../lib/permissions";

/* ------------------------------------------------------------------ *
 *  Music — Lavalink v4 node + lavalink-client. YouTube / SoundCloud /
 *  Bandcamp / Twitch / Vimeo via sources; per-guild player, queue and
 *  buttons. The node runs as the `lavalink` docker service.
 * ------------------------------------------------------------------ */

let manager: LavalinkManager | null = null;
let bot: Client | null = null;

function getManager(): LavalinkManager {
  if (!manager) throw new UserError("Music isn't configured on this instance (set LAVALINK_* in .env).");
  return manager;
}

function trackDuration(track: Track | UnresolvedTrack): number {
  const info = track.info as { duration?: number } | undefined;
  return info?.duration ?? 0;
}

function fmt(ms: number | undefined | null): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "live";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function requesterLabel(track: Track): string {
  const r = track.requester as { id?: string } | undefined;
  return r?.id ? `<@${r.id}>` : "unknown";
}

function controlsRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("mus:pause").setEmoji("⏯️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("mus:skip").setEmoji("⏭️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("mus:loop").setEmoji("🔁").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("mus:stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger),
  );
}

function trackEmbed(title: string, track: Track, footer?: string): EmbedBuilder {
  const e = embed({ color: COLORS.brand, title })
    .setDescription(`**[${track.info.title}](${track.info.uri ?? "https://discord.com"})**\nby ${track.info.author}`)
    .addFields(
      { name: "Duration", value: fmt(track.info.duration), inline: true },
      { name: "Requested by", value: requesterLabel(track), inline: true },
    );
  if (track.info.artworkUrl) e.setThumbnail(track.info.artworkUrl);
  if (footer) e.setFooter({ text: footer });
  return e;
}

async function leave(player: Player, notice?: string): Promise<void> {
  const textChannelId = player.textChannelId;
  await player.destroy("Music session ended").catch(() => undefined);
  if (notice && textChannelId && bot) {
    const channel = await bot.channels.fetch(textChannelId).catch(() => null);
    if (channel?.isSendable()) {
      await channel.send({ embeds: [embed({ color: COLORS.neutral, description: notice })] }).catch(() => undefined);
    }
  }
}

async function announceNowPlaying(player: Player, track: Track | null): Promise<void> {
  if (!track || !bot || !player.textChannelId) return;
  const channel = await bot.channels.fetch(player.textChannelId).catch(() => null);
  if (!channel?.isSendable()) return;
  await channel
    .send({ embeds: [trackEmbed("▶️ Now playing", track, `volume ${player.volume}% · loop ${player.repeatMode}`)], components: [controlsRow()] })
    .catch(() => undefined);
}

export const musicModule = defineModule({
  id: "music",
  name: "Music",
  version: "0.1.0",
  events: [
    {
      name: "clientReady",
      async execute(client: Client) {
        const password = process.env.LAVALINK_PASSWORD;
        if (!password) {
          console.log("[mem] music: LAVALINK_PASSWORD not set — music module idle");
          return;
        }
        bot = client;
        manager = new LavalinkManager({
          nodes: [
            {
              id: "main",
              host: process.env.LAVALINK_HOST ?? "127.0.0.1",
              port: Number(process.env.LAVALINK_PORT ?? 2333),
              authorization: password,
            },
          ],
          sendToShard: (guildId, payload) => {
            client.guilds.cache.get(guildId)?.shard?.send(payload as never);
          },
          autoSkip: true,
          client: { id: client.user?.id ?? "", username: client.user?.username ?? "" },
        });

        client.on("raw", (packet) => {
          if (packet.t === "VOICE_STATE_UPDATE" || packet.t === "VOICE_SERVER_UPDATE") {
            void manager?.sendRawData(packet as never);
          }
        });

        manager.nodeManager.on("connect", (node) => console.log(`[mem] lavalink node connected: ${node.id}`));
        manager.nodeManager.on("error", (node, error) => console.log(`[mem] lavalink node error (${node.id}):`, error?.message ?? error));
        manager.on("queueEnd", (player) => {
          void leave(player, "📭 Queue finished — left the voice channel.");
        });
        manager.on("trackStart", (player, track) => {
          void announceNowPlaying(player, track);
        });
        manager.on("trackError", (player, track) => {
          void (async () => {
            if (!bot || !player.textChannelId) return;
            const channel = await bot.channels.fetch(player.textChannelId).catch(() => null);
            if (channel?.isSendable()) {
              await channel
                .send({ embeds: [embed({ color: COLORS.error, description: `⚠️ Could not play **${track?.info?.title ?? "a track"}** — skipping.` })] })
                .catch(() => undefined);
            }
          })();
        });

        await manager.init({ id: client.user?.id ?? "", username: client.user?.username ?? "" });
        console.log("[mem] lavalink: manager initialised");
      },
    },
    {
      name: "voiceStateUpdate",
      async execute(oldState: VoiceState, newState: VoiceState) {
        if (!manager) return;
        const guild = newState.guild;
        const player = manager.getPlayer(guild.id);
        const vcId = player?.voiceChannelId;
        if (!player || !vcId) return;
        if (oldState.channelId !== vcId && newState.channelId !== vcId) return;
        const channel = guild.channels.cache.get(vcId);
        if (!channel || !channel.isVoiceBased()) return;
        const listeners = channel.members.filter((m) => !m.user.bot).size;
        if (listeners > 0) return;
        // grace period: moving between channels momentarily empties the old one
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const fresh = guild.channels.cache.get(vcId);
        const stillEmpty = fresh && fresh.isVoiceBased() ? fresh.members.filter((m) => !m.user.bot).size === 0 : true;
        const active = manager.getPlayer(guild.id);
        if (stillEmpty && active && active.voiceChannelId === vcId) {
          await leave(active, "👋 Everyone left — stopping the music.");
        }
      },
    },
  ],
  components: [
    {
      customIdPrefix: "mus:",
      async execute(interaction) {
        if (!interaction.isButton() || !interaction.inCachedGuild()) return;
        if (!manager) {
          await interaction.reply(ephemeral("Music isn't configured on this instance."));
          return;
        }
        const player = manager.getPlayer(interaction.guild.id);
        if (!player || !player.queue.current) {
          await interaction.reply(ephemeral("Nothing is playing right now."));
          return;
        }
        const sameChannel = interaction.member.voice.channelId === player.voiceChannelId;
        if (!sameChannel && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply(ephemeral("Join my voice channel to control the music."));
          return;
        }
        const action = interaction.customId.split(":")[1];
        let label = "✅ Done";
        if (action === "pause") {
          if (player.paused) {
            await player.resume().catch(() => undefined);
            label = "▶️ Resumed";
          } else {
            await player.pause().catch(() => undefined);
            label = "⏸️ Paused";
          }
        } else if (action === "skip") {
          label = (await player.skip().then(() => true).catch(() => false)) ? "⏭️ Skipped" : "Nothing to skip.";
        } else if (action === "stop") {
          await leave(player, "⏹️ Music stopped.");
          label = "⏹️ Stopped";
        } else if (action === "loop") {
          const modes = ["off", "track", "queue"] as const;
          const current = modes.indexOf(player.repeatMode as (typeof modes)[number]);
          const next = modes[(current + 1) % modes.length] as (typeof modes)[number];
          await player.setRepeatMode(next).catch(() => undefined);
          label = `🔁 Loop: ${next}`;
        }
        await interaction.reply(ephemeral(label)).catch(() => undefined);
      },
    },
  ],
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song or add it to the queue (search or URL).")
        .addStringOption((o) => o.setName("query").setDescription("Song name or link").setRequired(true).setMaxLength(400)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const vc = i.member.voice.channel;
        if (!vc) throw new UserError("Join a voice channel first, then run /play again.");
        const query = i.options.getString("query", true);
        const mgr = getManager();
        await i.deferReply();
        const player =
          mgr.getPlayer(i.guild.id) ??
          mgr.createPlayer({ guildId: i.guild.id, voiceChannelId: vc.id, textChannelId: i.channelId, volume: 80, selfDeaf: true });

        if (player.voiceChannelId !== vc.id) {
          await player.changeVoiceState({ voiceChannelId: vc.id }).catch(() => undefined);
        } else if (!player.connected) {
          await player.connect().catch(() => undefined);
        }

        const result = await player.search({ query }, i.user).catch(() => null);
        if (!result || !result.tracks.length) {
          await i.editReply(`😔 Nothing found for \`${query}\`.`);
          return;
        }
        const added = result.playlist ? result.tracks : result.tracks.slice(0, 1);
        await player.queue.add(added);
        if (!player.playing && !player.paused && !player.queue.current) {
          await player.play().catch(() => undefined);
        }
        const first = added[0] as Track;
        const position = player.queue.tracks.length;
        await i.editReply({
          embeds: [
            trackEmbed(
              result.playlist ? `➕ Playlist added: ${result.playlist.name}` : "➕ Added to queue",
              first,
              result.playlist ? `${added.length} tracks · position ${position}` : `position ${player.queue.tracks.length}`,
            ),
          ],
        });
      },
    },
    {
      data: new SlashCommandBuilder().setName("skip").setDescription("Skip the current track."),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const player = getManager().getPlayer(i.guild.id);
        if (!player?.queue.current) throw new UserError("Nothing is playing.");
        const ok = await player.skip().then(() => true).catch(() => false);
        if (!ok) throw new UserError("There's nothing after this track.");
        await i.reply({ embeds: [embed({ color: COLORS.success, description: "⏭️ Skipped." })] });
      },
    },
    {
      data: new SlashCommandBuilder().setName("stop").setDescription("Stop the music, clear the queue and leave."),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const player = getManager().getPlayer(i.guild.id);
        if (!player) throw new UserError("I'm not playing anything.");
        await leave(player, "⏹️ Music stopped.");
        await i.reply({ embeds: [embed({ color: COLORS.success, description: "⏹️ Stopped and left the voice channel." })] });
      },
    },
    {
      data: new SlashCommandBuilder().setName("pause").setDescription("Pause or resume the music."),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const player = getManager().getPlayer(i.guild.id);
        if (!player?.queue.current) throw new UserError("Nothing is playing.");
        if (player.paused) {
          await player.resume();
          await i.reply({ embeds: [embed({ color: COLORS.success, description: "▶️ Resumed." })] });
        } else {
          await player.pause();
          await i.reply({ embeds: [embed({ color: COLORS.success, description: "⏸️ Paused." })] });
        }
      },
    },
    {
      data: new SlashCommandBuilder().setName("nowplaying").setDescription("Show what's playing right now."),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const player = getManager().getPlayer(i.guild.id);
        const track = player?.queue.current;
        if (!player || !track) throw new UserError("Nothing is playing.");
        await i.reply({
          embeds: [
            trackEmbed("🎶 Now playing", track, `${fmt(player.position)} / ${fmt(track.info.duration)} · volume ${player.volume}% · loop ${player.repeatMode}`),
          ],
          components: [controlsRow()],
        });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Show the queue.")
        .addIntegerOption((o) => o.setName("page").setDescription("Page").setMinValue(1).setMaxValue(20)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const player = getManager().getPlayer(i.guild.id);
        if (!player || (!player.queue.current && player.queue.tracks.length === 0)) throw new UserError("The queue is empty.");
        const page = i.options.getInteger("page") ?? 1;
        const perPage = 10;
        const tracks = player.queue.tracks;
        const pages = Math.max(1, Math.ceil(tracks.length / perPage));
        const slice = tracks.slice((page - 1) * perPage, page * perPage);
        const totalMs = tracks.reduce((acc, t) => acc + trackDuration(t), 0);
        const lines = [
          player.queue.current ? `**▶️ ${player.queue.current.info.title}** — ${fmt(player.queue.current.info.duration)}` : "",
          ...slice.map((t, idx) => {
            const n = (page - 1) * perPage + idx + 1;
            return `\`${n}.\` [${t.info.title}](${t.info.uri ?? "https://discord.com"}) — ${fmt(trackDuration(t))}`;
          }),
        ].filter(Boolean);
        await i.reply({
          embeds: [
            embed({ color: COLORS.brand, title: `🎵 Queue — page ${page}/${pages}`, description: lines.join("\n") || "*empty*" }).setFooter({
              text: `${tracks.length} track(s) waiting · ${fmt(totalMs)} total · loop ${player.repeatMode}`,
            }),
          ],
        });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Set the volume (1-200).")
        .addIntegerOption((o) => o.setName("percent").setDescription("Volume %").setRequired(true).setMinValue(1).setMaxValue(200)),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const player = getManager().getPlayer(i.guild.id);
        if (!player) throw new UserError("I'm not playing anything.");
        const percent = i.options.getInteger("percent", true);
        await player.setVolume(percent);
        await i.reply({ embeds: [embed({ color: COLORS.success, description: `🔊 Volume set to **${percent}%**.` })] });
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Loop mode: off, the current track, or the whole queue.")
        .addStringOption((o) =>
          o
            .setName("mode")
            .setDescription("Loop mode")
            .setRequired(true)
            .addChoices({ name: "off", value: "off" }, { name: "track", value: "track" }, { name: "queue", value: "queue" }),
        ),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        const player = getManager().getPlayer(i.guild.id);
        if (!player) throw new UserError("I'm not playing anything.");
        const mode = i.options.getString("mode", true) as "off" | "track" | "queue";
        await player.setRepeatMode(mode);
        await i.reply({ embeds: [embed({ color: COLORS.success, description: `🔁 Loop mode: **${mode}**.` })] });
      },
    },
  ],
});
