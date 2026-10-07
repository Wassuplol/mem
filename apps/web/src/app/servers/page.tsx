import { Suspense } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { ArrowUpRight, Crown, ShieldCheck, Server as ServerIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { fetchManageableGuilds } from "@/lib/discord-guilds";
import { AppShell, INVITE_URL } from "@/components/app-shell";
import { SignInButton } from "@/components/sign-in-button";

const iconUrl = (guildId: string, icon: string) =>
  `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=128`;

function ServersSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="glass h-[84px] animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}

async function ServersContent() {
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
          Sign in to see every server you can manage — Mem checks live guild permissions.
        </p>
        <div className="mt-6 flex justify-center">
          <SignInButton />
        </div>
      </div>
      </div>
    );
  }

  const result = await fetchManageableGuilds(session.user.id);

  if (!result.ok) {
    const messages: Record<string, string> = {
      no_discord_token: "No Discord token on file — sign out and sign back in.",
      discord_token_expired: "Your Discord session expired — sign in again.",
    };
    return (
      <div className="animate-fade-up rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-6 text-sm text-amber-200">
        {messages[result.error] ?? `Could not load your servers (${result.error}).`}
      </div>
    );
  }

  if (result.guilds.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-190px)] items-center justify-center">
      <div className="glass animate-fade-up w-full max-w-lg rounded-2xl border-dashed p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-400">
          <ServerIcon className="h-6 w-6" />
        </span>
        <h3 className="mt-5 text-lg font-semibold">No manageable servers yet</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Invite Mem to a server where you have <span className="text-zinc-200">Manage Server</span> — it
          will show up here instantly.
        </p>
        <a
          href={INVITE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:brightness-110"
        >
          Invite Mem <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
      </div>
    );
  }

  return (
    <>
      <p className="animate-fade-up mb-4 text-[13px] text-zinc-500">
        {result.guilds.length} server{result.guilds.length > 1 ? "s" : ""} · signed in as{" "}
        <span className="text-zinc-300">{session.user.name}</span>
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {result.guilds.map((guild, i) => (
          <li
            key={guild.id}
            className={`glass card-lift animate-fade-up delay-${Math.min(i + 1, 4)} flex items-center gap-4 rounded-2xl p-4`}
          >
            {guild.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconUrl(guild.id, guild.icon)}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-2xl shadow-lg shadow-black/40"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/40 to-cyan-500/20 text-base font-bold">
                {guild.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{guild.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
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
              </div>
            </div>
            <span className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-500">
              Manage · soon
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[11.5px] text-zinc-600">
        API: <code className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono">GET /api/guilds</code>{" "}
        returns this list as JSON. Per-server control pages are next on the roadmap.
      </p>
    </>
  );
}

export default function ServersPage() {
  return (
    <AppShell title="Servers" subtitle="Communities you can manage">
      <Suspense fallback={<ServersSkeleton />}>
        <ServersContent />
      </Suspense>
    </AppShell>
  );
}
