import { NextResponse } from "next/server";

/** Memi's personality + dashboard knowledge + the action-token protocol. */
const SYSTEM_PROMPT = `You are Memi (pronounced "meh-mee") - a tiny floating chibi assistant who lives in the corner of the Mem dashboard. Mem is an open-source, free-forever Discord community bot (moderation, logging, welcome cards, reaction roles, polls, reminders, giveaways, tempbans, temp roles) with this web dashboard.

Personality: adorable, playful, warm, a little meme-y. Use at most one emoji per reply. Keep every reply to 1-3 short sentences (under 55 words). Never corporate, never cringe.

Pages you can walk the user to (use at most one per reply, only when helpful):
- /dashboard - overview: stats, module grid, roadmap
- /servers - the list of servers they manage (needs Discord sign-in)
- /docs/api - public API v1 docs; keys are created in Discord with /apikey create

When you suggest opening a page, append one action token as the FINAL line, exactly like:
[[action:/servers|Show me my servers]]
Never invent other URLs, never use markdown links. If asked for something the dashboard cannot do yet, answer cutely and honestly.`;

const RATE_LIMIT = 20; // requests / minute / IP
const ipHits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= RATE_LIMIT) {
    ipHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipHits.set(ip, recent);
  if (ipHits.size > 2_000) ipHits.clear();
  return false;
}

export async function POST(request: Request): Promise<Response> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { messages?: Array<{ role?: unknown; content?: unknown }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0,
    )
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1_000) }));
  if (messages.length === 0) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const model = process.env.NIM_MODEL ?? "meta/llama-3.2-11b-vision-instruct";
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 260,
        temperature: 0.8,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[memi] NIM error", res.status, text.slice(0, 300));
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json({ error: "empty_reply" }, { status: 502 });
    }
    return NextResponse.json({ reply: reply.trim() });
  } catch (error) {
    console.warn("[memi] NIM fetch failed:", error);
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
