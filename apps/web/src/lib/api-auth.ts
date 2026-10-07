import { createHash } from "node:crypto";
import { createServices } from "@mem/db";
import { db } from "./db";

export const services = createServices(db);

/** Authenticated identity behind a /api/v1 request. */
export interface ApiAuth {
  keyId: string;
  guildId: string;
  name: string;
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

/* ---------- in-memory sliding-window rate limit (per key) ---------- */

const RATE_LIMIT = 120; // requests / minute
const hits = new Map<string, number[]>();

function rateLimited(keyId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(keyId) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= RATE_LIMIT) {
    hits.set(keyId, recent);
    return true;
  }
  recent.push(now);
  hits.set(keyId, recent);
  if (hits.size > 1_000) hits.clear();
  return false;
}

/** Validates `Authorization: Bearer mem_...` and returns the key's scope. */
export async function authenticate(request: Request): Promise<{ auth: ApiAuth } | { error: Response }> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return {
      error: json(
        { error: "missing_api_key", message: "Send an Authorization: Bearer mem_... header." },
        401,
      ),
    };
  }
  const hash = createHash("sha256").update(token).digest("hex");
  const key = await services.findApiKeyByHash(hash);
  if (!key) {
    return { error: json({ error: "invalid_api_key", message: "Unknown or revoked key." }, 401) };
  }
  if (rateLimited(key.id)) {
    return {
      error: json({ error: "rate_limited", message: `Max ${RATE_LIMIT} requests per minute per key.` }, 429),
    };
  }
  void services.touchApiKey(key.id).catch(() => undefined);
  return { auth: { keyId: key.id, guildId: key.guildId, name: key.name } };
}

/** 403 unless the path guild matches the key's guild. */
export function scopedGuild(auth: ApiAuth, guildId: string): Response | null {
  if (auth.guildId !== guildId) {
    return json(
      { error: "guild_scope_mismatch", message: "This API key belongs to a different guild." },
      403,
    );
  }
  return null;
}
