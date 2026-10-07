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

  const cases = await services.listCases(id, { limit: 1 });
  const giveaways = await services.listGiveaways(id, { limit: 25 });
  const polls = await services.listOpenPolls(id, 25);

  return json({
    data: {
      guildId: id,
      counts: {
        giveawaysTotal: giveaways.length,
        giveawaysOpen: giveaways.filter((g) => !g.ended).length,
        pollsOpen: polls.length,
        latestCaseNumber: cases[0]?.caseNumber ?? 0,
      },
    },
  });
}
