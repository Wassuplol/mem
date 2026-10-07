import { json } from "@/lib/api-auth";

/** Public API index - no auth needed, so integrators can discover routes. */
export function GET(): Response {
  return json({
    name: "Mem public API",
    version: "v1",
    docs: "/docs/api",
    auth: "Authorization: Bearer mem_...  (create keys with /apikey create)",
    endpoints: [
      "GET /api/v1/me",
      "GET /api/v1/guilds/{guildId}",
      "GET /api/v1/guilds/{guildId}/cases?target=&limit=",
      "GET /api/v1/guilds/{guildId}/cases/{number}",
      "GET /api/v1/guilds/{guildId}/warnings/{userId}",
      "GET /api/v1/guilds/{guildId}/giveaways?open=true",
      "GET /api/v1/guilds/{guildId}/polls",
    ],
  });
}
