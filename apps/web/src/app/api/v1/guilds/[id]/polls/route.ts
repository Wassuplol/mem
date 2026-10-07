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

  const polls = await services.listOpenPolls(id, 25);
  const data = [];
  for (const poll of polls) {
    const tally = await services.getPollTally(poll.id);
    data.push({
      id: poll.id,
      question: poll.question,
      options: poll.options,
      counts: tally.counts,
      totalVotes: tally.totalVotes,
      voterCount: tally.voterCount,
      multiple: poll.multiple,
      endsAt: poll.endsAt?.toISOString() ?? null,
      createdAt: poll.createdAt.toISOString(),
    });
  }
  return json({ data, meta: { guildId: id, count: data.length } });
}
