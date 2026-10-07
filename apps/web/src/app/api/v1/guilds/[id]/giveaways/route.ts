import { authenticate, json, scopedGuild, services } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const result = await authenticate(request);
  if ("error" in result) return result.error;
  const { auth } = result;
  const { id } = await params;
  const scopeError = scopedGuild(auth, id);
  if (scopeError) return scopeError;

  const url = new URL(request.url);
  const openOnly = url.searchParams.get("open") === "true";
  const giveaways = await services.listGiveaways(id, { openOnly, limit: 25 });

  const data = [];
  for (const gw of giveaways) {
    const entries = await services.countGiveawayEntries(gw.id);
    data.push({
      id: gw.id,
      prize: gw.prize,
      winnerCount: gw.winnerCount,
      entries,
      ended: gw.ended,
      winners: gw.winners ?? [],
      endsAt: gw.endsAt.toISOString(),
      createdAt: gw.createdAt.toISOString(),
      url: `https://discord.com/channels/${gw.guildId}/${gw.channelId}/${gw.messageId ?? ""}`,
    });
  }
  return json({ data, meta: { guildId: id, count: data.length, open: openOnly } });
}
