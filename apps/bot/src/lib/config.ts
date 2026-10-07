import "./env";

export const config = {
  token: process.env.DISCORD_TOKEN ?? "",
  clientId: process.env.DISCORD_CLIENT_ID,
  devGuildId: process.env.DEV_GUILD_ID,
  /** Server Members intent (privileged): needed for welcome + member join/leave logs. */
  membersIntent: process.env.ENABLE_MEMBERS_INTENT === "1",
};
