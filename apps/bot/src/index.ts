import "./lib/env";

import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Options,
  REST,
  Routes,
  type InteractionReplyOptions,
} from "discord.js";
import { config } from "./lib/config";
import { UserError } from "./lib/permissions";
import { services } from "./lib/services";
import { registry } from "./registry";

console.log(`[mem] ${registry.commands().length} command(s) across ${registry.list().length} module(s)`);

if (!config.token) {
  console.error("[mem] DISCORD_TOKEN is missing - copy .env.example to .env and fill it in.");
  process.exit(1);
}
const botToken: string = config.token;

/**
 * RAM-conscious cache configuration (owner requirement: keep the bot lean).
 * - messages / presences / reactions / events: not cached (swept aggressively)
 * - members & users: capped at 100 per guild/user cache
 * All durable state lives in Postgres/Redis - nothing grows in memory.
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager: 0,
    PresenceManager: 0,
    ReactionManager: 0,
    GuildScheduledEventManager: 0,
    GuildStickerManager: 0,
    ThreadMemberManager: 0,
    StageInstanceManager: 0,
    VoiceStateManager: 0,
    GuildMemberManager: { maxSize: 100, keepOverLimit: (member) => member.id === member.client.user?.id },
    UserManager: { maxSize: 100, keepOverLimit: (user) => user.id === user.client.user?.id },
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: { interval: 300, lifetime: 900 },
  },
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[mem] online as ${readyClient.user.tag} - ${readyClient.guilds.cache.size} guild(s)`);
  await registerCommands();
});

client.on(Events.GuildCreate, (guild) => {
  void services.ensureGuild(guild.id, guild.name).catch((error) => {
    console.error("[mem] ensureGuild failed:", error);
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = registry.commands().find((c) => c.data.name === interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, { client });
  } catch (error) {
    if (error instanceof UserError) {
      const message: InteractionReplyOptions = { content: error.message, flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(message).catch(() => undefined);
      } else {
        await interaction.reply(message).catch(() => undefined);
      }
      return;
    }
    console.error(`[mem] /${interaction.commandName} failed:`, error);
    const message: InteractionReplyOptions = {
      content: "Something went wrong running that command.",
      flags: MessageFlags.Ephemeral,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(message).catch(() => undefined);
    } else {
      await interaction.reply(message).catch(() => undefined);
    }
  }
});

async function registerCommands(): Promise<void> {
  const body = registry.commands().map((c) => c.data.toJSON());
  if (body.length === 0) return;

  const rest = new REST().setToken(botToken);
  try {
    if (config.clientId && config.devGuildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.devGuildId), { body });
      console.log(`[mem] registered ${body.length} guild command(s) in ${config.devGuildId}`);
    } else if (config.clientId) {
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      console.log(`[mem] registered ${body.length} global command(s)`);
    } else {
      console.warn("[mem] DISCORD_CLIENT_ID missing - skipped command registration");
    }
  } catch (error) {
    console.error("[mem] command registration failed:", error);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[mem] ${signal} received - shutting down`);
    void client.destroy().finally(() => process.exit(0));
  });
}

await client.login(botToken);
