import { authenticate, json } from "@/lib/api-auth";

export async function GET(request: Request): Promise<Response> {
  const result = await authenticate(request);
  if ("error" in result) return result.error;
  const { auth } = result;
  return json({
    data: {
      key: { id: auth.keyId, name: auth.name },
      guildId: auth.guildId,
      scopes: ["read"],
    },
  });
}
