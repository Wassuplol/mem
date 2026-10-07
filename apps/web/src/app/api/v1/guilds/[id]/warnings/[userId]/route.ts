import { authenticate, json, scopedGuild, services } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
): Promise<Response> {
  const result = await authenticate(request);
  if ("error" in result) return result.error;
  const { auth } = result;
  const { id, userId } = await params;
  const scopeError = scopedGuild(auth, id);
  if (scopeError) return scopeError;

  const warnings = await services.listActiveWarnings(id, userId);
  return json({
    data: warnings.map((w) => ({
      number: w.caseNumber,
      reason: w.reason,
      moderatorId: w.moderatorId,
      createdAt: w.createdAt.toISOString(),
    })),
    meta: { guildId: id, userId, active: warnings.length },
  });
}
