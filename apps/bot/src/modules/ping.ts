import { SlashCommandBuilder } from "discord.js";
import { defineModule } from "@mem/core";

/**
 * Example module - proves the kernel contract end-to-end.
 * Real modules (moderation, logging, ...) follow this same shape.
 */
export const pingModule = defineModule({
  id: "ping",
  name: "Ping",
  version: "0.0.1",
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check that Mem is alive."),
      async execute(interaction, ctx) {
        const ping = Math.max(0, Math.round(ctx.client.ws.ping));
        await interaction.reply(`Pong! gateway ${ping} ms`);
      },
    },
  ],
});
