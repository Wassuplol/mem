import { Suspense } from "react";

/* Fully runtime route: needs session + live Discord data, so opt out of partial prerendering. */
export const instant = false;
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight, Crown, ExternalLink, Server as ServerIcon, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { fetchGuildDetail } from "@/lib/guild-detail";
import { MODULES } from "@/lib/modules";
import { AppShell, INVITE_URL } from "@/components/app-shell";
import { SignInButton } from "@/components/sign-in-button";

const iconUrl = (guildId: string, icon: string) => `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=256`;

const LABEL = "text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600";

function updatedLabel(iso: string | null): string {
  if (!iso) return "Configured";
  const d = new Date(iso);
  return `Updated ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

function ServerSkeleton() {
  return (
    <div className="space-y-8">
      <div className="glass h-[112px] animate-pulse rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass h-[86px] animate-pulse rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass h-[124px] animate-pulse rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

async function ServerContent({ id }: { id: string }) {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <div className="flex min-h-[calc(100vh-190px)] items-center justify-center">
        <div className="glass animate-fade-up w-full max-w-lg rounded-2xl p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/15 text-violet-200">
            <ServerIcon className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-semibold">Connect your Discord</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Sign in to open this server&rsquo;s control room.
          </p>
          <div className="mt-6 flex justify-center">
            <SignInButton />
          </div>
        </div>
      </div>
    );
  }

  const result = await fetchGuildDetail(session.user.id, id);

  if (!result.ok) {
    const messages: Record<string, string> = {
      no_discord_token: "No Discord token on file — sign out and sign back in.",
      discord_token_expired: "Your Discord session expired — sign in again.",
      not_manageable: "You need Manage Server permission on this server to open its control room.",
    };
    return (
      <div className="space-y-6">
        <Link href="/servers" className="animate-fade-up inline-flex items-center gap-1.5 text-[12.5px] text-zinc-500 transition hover:text-zinc-200">
          <ArrowLeft className="h-3.5 w-3.5" /> All servers
        </Link>
        <div className="animate-fade-up rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-6 text-sm text-amber-200">
          {messages[result.error] ?? `Could not load this server (${result.error}).`}
        </div>
      </div>
    );
  }

  const { guild, joined, modules, stats } = result.detail;
  const stateById = new Map(modules.map((m) => [m.id, m]));
  const liveModules = MODULES.filter((m) => m.status === "live").length;

  return (
    <div className="space-y-8">
      <Link href="/servers" className="animate-fade-up inline-flex items-center gap-1.5 text-[12.5px] text-zinc-500 transition hover:text-zinc-200">
        <ArrowLeft className="h-3.5 w-3.5" /> All servers
      </Link>

      {/* header */}
      <section className="glass animate-fade-up rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-5">
          {guild.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl(guild.id, guild.icon)}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl shadow-lg shadow-black/40"
            />
          ) : (
            <span className="font-display flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/40 to-cyan-500/20 text-2xl font-bold">
              {guild.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display truncate text-2xl font-bold tracking-tight">{guild.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              {guild.owner ? (
                <span className="flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-2 py-0.5 font-medium text-amber-300">
                  <Crown className="h-3 w-3" /> Owner
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full border border-sky-400/25 bg-sky-400/[0.06] px-2 py-0.5 font-medium text-sky-300">
                  <ShieldCheck className="h-3 w-3" /> Manage Server
                </span>
              )}
              <span className="font-mono text-zinc-600">{guild.id}</span>
              {joined && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] px-2 py-0.5 font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Mem is here
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`https://discord.com/channels/${guild.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-[12.5px] text-zinc-300 transition hover:border-white/20 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in Discord
            </a>
            {!joined && (
              <a
                href={`${INVITE_URL}&guild_id=${guild.id}&disable_guild_select=true`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:brightness-110"
              >
                Invite Mem <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
        {!joined && (
          <p className="mt-5 rounded-xl border border-violet-400/20 bg-violet-400/[0.05] px-4 py-3 text-[12.5px] leading-relaxed text-violet-200">
            Mem is not in this server yet — invite it to unlock live stats and module setup.
          </p>
        )}
      </section>

      {/* stats */}
      {joined && (
        <section className="animate-fade-up grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Cases", value: stats.cases },
            { label: "Open polls", value: stats.openPolls },
            { label: "Open giveaways", value: stats.openGiveaways },
            { label: "Role panels", value: stats.rolePanels },
          ].map((s) => (
            <div key={s.label} className="glass card-lift rounded-2xl p-4">
              <p className="font-display text-2xl font-bold tracking-tight">{s.value}</p>
              <p className={`mt-1 ${LABEL}`}>{s.label}</p>
            </div>
          ))}
        </section>
      )}

      {/* modules */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="font-display text-lg font-semibold tracking-tight">Modules</h4>
          <span className="text-[11.5px] text-zinc-600">
            {joined ? `${modules.length} configured · ` : ""}{liveModules} live
          </span>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const configured = stateById.has(m.id);
            const state = stateById.get(m.id);
            return (
              <li key={m.id} className={`glass card-lift animate-fade-up rounded-2xl p-5 ${m.status === "soon" ? "opacity-70" : ""}`}>
                <div className="flex items-start gap-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${m.accent}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14.5px] font-semibold">{m.name}</p>
                      {m.status === "live" ? (
                        m.commands ? (
                          <span className="font-hud rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
                            {m.commands} cmds
                          </span>
                        ) : null
                      ) : (
                        <span className="font-hud rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                          soon
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-400">{m.description}</p>
                    {m.status === "live" && (
                      <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px]">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            !joined ? "bg-zinc-600" : configured ? "bg-emerald-400" : "bg-zinc-600"
                          }`}
                        />
                        <span className={!joined ? "text-zinc-600" : configured ? "text-emerald-200/90" : "text-zinc-500"}>
                          {!joined
                            ? "Live once Mem joins"
                            : configured
                              ? updatedLabel(state?.updatedAt ?? null)
                              : "Default settings"}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-[11.5px] leading-relaxed text-zinc-600">
          Configure everything with{" "}
          <code className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono">/help</code>{" "}
          in Discord — dashboard toggles are on the roadmap.
        </p>
      </section>
    </div>
  );
}

export default async function ServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell title="Control room" subtitle="Per-server modules & stats">
      <Suspense fallback={<ServerSkeleton />}>
        <ServerContent id={id} />
      </Suspense>
    </AppShell>
  );
}
