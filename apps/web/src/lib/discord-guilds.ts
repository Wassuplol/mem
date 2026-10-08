import { and, eq } from "drizzle-orm";
import { account } from "@mem/db";
import { db } from "./db";

export interface ManageableGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

export type GuildsResult =
  | { ok: true; guilds: ManageableGuild[] }
  | { ok: false; status: number; error: string };

/** Discord permission bit for MANAGE_GUILD. */
const MANAGE_GUILD = BigInt(0x20);

/**
 * Short-lived per-user cache — the dashboard fires several API calls per page
 * and Discord rate-limits /users/@me/guilds aggressively (429 seen live).
 * RAM-bounded, 60s TTL, success-only.
 */
const guildsCache = new Map<string, { at: number; result: GuildsResult }>();
const GUILDS_TTL_MS = 60_000;
const GUILDS_CACHE_CAP = 500;

/** Invalidates the cached guild list for a user (call after token changes). */
export function invalidateManageableGuilds(userId: string): void {
  guildsCache.delete(userId);
}

/**
 * Lists the guilds a user can manage, using the Discord OAuth access token
 * that Better Auth stored in the `account` table during sign-in.
 */
export async function fetchManageableGuilds(userId: string): Promise<GuildsResult> {
  const hit = guildsCache.get(userId);
  if (hit && Date.now() - hit.at < GUILDS_TTL_MS) return hit.result;

  const rows = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "discord")));
  const accessToken = rows[0]?.accessToken;
  if (!accessToken) {
    return { ok: false, status: 409, error: "no_discord_token" };
  }

  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 401) {
    return { ok: false, status: 401, error: "discord_token_expired" };
  }
  if (!response.ok) {
    return { ok: false, status: 502, error: `discord_${response.status}` };
  }

  const raw = (await response.json()) as Array<{
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
  }>;

  const guilds = raw
    .filter((g) => g.owner || (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD)
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon, owner: g.owner }));

  const result: GuildsResult = { ok: true, guilds };
  if (guildsCache.size >= GUILDS_CACHE_CAP) {
    const oldest = guildsCache.keys().next().value;
    if (oldest !== undefined) guildsCache.delete(oldest);
  }
  guildsCache.set(userId, { at: Date.now(), result });
  return result;
}
