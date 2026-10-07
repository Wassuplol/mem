import { Braces, KeyRound, ShieldCheck, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const ENDPOINTS: Array<{ method: string; path: string; desc: string }> = [
  { method: "GET", path: "/api/v1", desc: "Index of every endpoint (no auth needed)." },
  { method: "GET", path: "/api/v1/me", desc: "The key behind the request: id, name, guild scope." },
  { method: "GET", path: "/api/v1/guilds/{guildId}", desc: "Guild summary: open polls, giveaways, latest case number." },
  { method: "GET", path: "/api/v1/guilds/{guildId}/cases?target=&limit=", desc: "Moderation cases, newest first. Filter by member, cap 50." },
  { method: "GET", path: "/api/v1/guilds/{guildId}/cases/{number}", desc: "One case by its number." },
  { method: "GET", path: "/api/v1/guilds/{guildId}/warnings/{userId}", desc: "Active warnings for a member." },
  { method: "GET", path: "/api/v1/guilds/{guildId}/giveaways?open=true", desc: "Giveaways with live entry counts and winners." },
  { method: "GET", path: "/api/v1/guilds/{guildId}/polls", desc: "Open polls with tallies." },
];

const CURL_EXAMPLE = `# create a key in Discord:  /apikey create name:"my backend"
curl -H "Authorization: Bearer mem_your_key_here" \
  http://localhost:3000/api/v1/guilds/123456789012345678/cases?limit=5`;

const RESPONSE_EXAMPLE = `{
  "data": [
    {
      "number": 42,
      "action": "tempban",
      "targetId": "111111111111111111",
      "moderatorId": "222222222222222222",
      "reason": "spam",
      "active": false,
      "createdAt": "2026-10-07T19:12:44.000Z"
    }
  ],
  "meta": { "guildId": "123456789012345678", "count": 1, "target": null }
}`;

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-[12.5px] leading-relaxed text-zinc-300">
      {children}
    </pre>
  );
}

export default function ApiDocsPage() {
  return (
    <AppShell title="API docs" subtitle="Build on top of Mem">
      <div className="animate-fade-up grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/15 text-violet-200">
              <Braces className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Mem public API v1</h2>
              <p className="text-[13px] text-zinc-400">Everything your dashboard sees, over plain HTTP + JSON.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4 text-[13.5px] leading-relaxed text-zinc-300">
            <p>
              Mem is not just slash commands — every feature is backed by an API. Create a key with{" "}
              <code className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[12px]">/apikey create</code>{" "}
              in your server (Manage Server required), then send it as a bearer token. Keys are stored hashed and shown{" "}
              <span className="text-zinc-100">once</span>.
            </p>
            <Code>{CURL_EXAMPLE}</Code>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Scoping</h3>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
              Every key is bound to one guild. Requests for any other guild return <code className="font-mono">403</code> —
              a leaked key can never touch servers it does not belong to.
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 text-amber-300">
              <Zap className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Rate limits</h3>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
              120 requests per minute per key. Over the limit returns <code className="font-mono">429</code> with{" "}
              <code className="font-mono">error: rate_limited</code>.
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 text-cyan-300">
              <KeyRound className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Revoking</h3>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
              <code className="font-mono">/apikey list</code> shows keys with last-used times;{" "}
              <code className="font-mono">/apikey revoke</code> kills one instantly.
            </p>
          </div>
        </div>
      </div>

      <div className="glass animate-fade-up delay-1 mt-5 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-zinc-200">Endpoints</h3>
        <ul className="mt-4 divide-y divide-white/[0.06]">
          {ENDPOINTS.map((e) => (
            <li key={e.path} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
              <span className="rounded-md border border-emerald-400/25 bg-emerald-400/[0.07] px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                {e.method}
              </span>
              <code className="font-mono text-[13px] text-zinc-100">{e.path}</code>
              <span className="text-[12.5px] text-zinc-500">{e.desc}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass animate-fade-up delay-2 mt-5 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-zinc-200">Example response</h3>
        <div className="mt-3">
          <Code>{RESPONSE_EXAMPLE}</Code>
        </div>
      </div>
    </AppShell>
  );
}
