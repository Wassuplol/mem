import { authenticate, json, scopedGuild, services } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; number: string }> },
): Promise<Response> {
  const result = await authenticate(request);
  if ("error" in result) return result.error;
  const { auth } = result;
  const { id, number } = await params;
  const scopeError = scopedGuild(auth, id);
  if (scopeError) return scopeError;

  const caseNumber = Number(number);
  if (!Number.isInteger(caseNumber) || caseNumber < 1) {
    return json({ error: "bad_request", message: "Case number must be a positive integer." }, 400);
  }
  const found = await services.getCaseByNumber(id, caseNumber);
  if (!found) return json({ error: "not_found", message: `No case #${caseNumber} in this guild.` }, 404);

  return json({
    data: {
      number: found.caseNumber,
      action: found.action,
      targetId: found.targetId,
      moderatorId: found.moderatorId,
      reason: found.reason,
      active: found.active,
      createdAt: found.createdAt.toISOString(),
    },
  });
}
