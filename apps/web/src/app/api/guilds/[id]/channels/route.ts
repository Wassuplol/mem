import { NextResponse } from "next/server";
import { authorizeGuild } from "@/lib/guild-authz";

/**
 * GET /api/guilds/[id]/channels
 * Channel + role pickers for the dashboard editor, pulled live from Discord
 * with the bot token. Session-authed; only for guilds the user manages.
 */

type Params = { params: Promise<{ id: string }> };

interface DiscordChannel { id: string; name: string; type: number; position: number }
interface DiscordRole { id: string; name: string; color: number; position: number }

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  const authz = await authorizeGuild(id);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const token = process.env.DISCORD_TOKEN;
  if (!token) return NextResponse.json({ error: "no_bot_token" }, { status: 500 });

  const [chRes, roleRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${id}/channels`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    }),
    fetch(`https://discord.com/api/v10/guilds/${id}/roles`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    }),
  ]);
  if (!chRes.ok || !roleRes.ok) {
    return NextResponse.json({ error: "discord_error" }, { status: 502 });
  }

  const channels = (await chRes.json()) as DiscordChannel[];
  const roles = (await roleRes.json()) as DiscordRole[];

  return NextResponse.json({
    // text, announcement, voice and forum channels can matter for configs
    channels: channels
      .filter((c) => [0, 5, 2, 15].includes(c.type))
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name, type: c.type })),
    roles: roles
      .filter((r) => r.id !== id)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.id, name: r.name })),
  });
}
