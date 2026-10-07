import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db";

/**
 * Dashboard auth (Better Auth + Discord provider).
 * Needs real credentials to go live: DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET
 * (Discord Developer Portal -> your app), BETTER_AUTH_SECRET (`npx auth@latest secret`),
 * BETTER_AUTH_URL. Builds fine without them; login only works once they're set.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      // identify + guilds: enough to render the user's server list in the dashboard
      scope: ["identify", "guilds"],
    },
  },
});
