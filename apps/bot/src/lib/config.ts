import "./env";

export const config = {
  token: process.env.DISCORD_TOKEN ?? "",
  clientId: process.env.DISCORD_CLIENT_ID,
  devGuildId: process.env.DEV_GUILD_ID,
};
