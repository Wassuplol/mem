import { headers } from "next/headers";
import { auth } from "./auth";
import { fetchManageableGuilds } from "./discord-guilds";

export type GuildAuthz = { ok: true; userId: string } | { ok: false; status: number; error: string };

/**
 * Session + Manage-Server authorization for a SINGLE guild.
 * Every dashboard read/write must pass this — a user can only ever touch
 * guilds they actually manage, so settings can never leak across servers.
 */
export async function authorizeGuild(guildId: string): Promise<GuildAuthz> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, status: 401, error: "unauthorized" };
  const manageable = await fetchManageableGuilds(session.user.id);
  if (!manageable.ok) return { ok: false, status: manageable.status, error: manageable.error };
  if (!manageable.guilds.some((g) => g.id === guildId)) return { ok: false, status: 403, error: "not_manageable" };
  return { ok: true, userId: session.user.id };
}
