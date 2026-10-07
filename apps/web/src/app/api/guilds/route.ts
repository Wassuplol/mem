import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchManageableGuilds } from "@/lib/discord-guilds";

/**
 * GET /api/guilds
 * Session-authenticated list of guilds the signed-in user can manage.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await fetchManageableGuilds(session.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ guilds: result.guilds });
}
