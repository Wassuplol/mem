import "dotenv/config";
import { Client, Events, GatewayIntentBits, MessageFlags, REST, Routes, type InteractionReplyOptions } from "discord.js";
import { ModuleRegistry, type ModuleContext } from "@mem/core";
import { pingModule } from "./modules/ping";

const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_APP_ID;
const devGuildId = process.env.DEV_GUILD_ID;

if (!token) {
  console.error("[mem] DISCORD_TOKEN is missing - copy .env.example to .env and fill it in.");
  process.exit(1);
}
const botToken: string = token;

const registry = new ModuleRegistry();
registry.register(pingModule);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const ctx: ModuleContext = { client };

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[mem] online as ${readyClient.user.tag} - ${readyClient.guilds.cache.size} guild(s)`);
  await registerCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = registry.commands().find((c) => c.data.name === interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, ctx);
  } catch (error) {
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
    if (appId && devGuildId) {
      await rest.put(Routes.applicationGuildCommands(appId, devGuildId), { body });
      console.log(`[mem] registered ${body.length} guild command(s) in ${devGuildId}`);
    } else if (appId) {
      await rest.put(Routes.applicationCommands(appId), { body });
      console.log(`[mem] registered ${body.length} global command(s)`);
    } else {
      console.warn("[mem] DISCORD_APP_ID missing - skipped command registration");
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
