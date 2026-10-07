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
  const target = url.searchParams.get("target") ?? undefined;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 25) || 25, 1), 50);

  const cases = await services.listCases(id, { targetId: target, limit });
  return json({
    data: cases.map((c) => ({
      number: c.caseNumber,
      action: c.action,
      targetId: c.targetId,
      moderatorId: c.moderatorId,
      reason: c.reason,
      active: c.active,
      createdAt: c.createdAt.toISOString(),
    })),
    meta: { guildId: id, count: cases.length, target: target ?? null },
  });
}
