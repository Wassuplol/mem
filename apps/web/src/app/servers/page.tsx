import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { fetchManageableGuilds } from "@/lib/discord-guilds";
import { SignInButton } from "@/components/sign-in-button";

const iconUrl = (guildId: string, icon: string) =>
  `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=64`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your servers</h1>
          <Link href="/" className="text-xs text-zinc-500 underline">
            back home
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}

async function ServersContent() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
        <p className="text-zinc-400">Sign in with Discord to see the servers you can manage.</p>
        <SignInButton />
      </div>
    );
  }

  const result = await fetchManageableGuilds(session.user.id);

  return (
    <>
      <p className="text-sm text-zinc-500">Signed in as {session.user.name}</p>

      {!result.ok && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 text-sm text-amber-300">
          {result.error === "no_discord_token" && "No Discord token on file - sign out and sign back in."}
          {result.error === "discord_token_expired" && "Your Discord session expired - sign in again."}
          {result.error !== "no_discord_token" && result.error !== "discord_token_expired" &&
            `Could not load your servers (${result.error}).`}
        </div>
      )}

      {result.ok && result.guilds.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-400">
          No manageable servers found. Invite Mem to a server where you have Manage Server, then check again.
        </div>
      )}

      {result.ok && result.guilds.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {result.guilds.map((guild) => (
            <li key={guild.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              {guild.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={iconUrl(guild.id, guild.icon)} alt="" width={40} height={40} className="rounded-full" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold">
                  {guild.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{guild.name}</p>
                <p className="text-xs text-zinc-500">
                  {guild.owner ? "Owner" : "Manage Server"} · {guild.id}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-500">
        API: <code className="rounded bg-zinc-900 px-1.5 py-0.5">GET /api/guilds</code> returns this list as JSON.
        Per-server dashboards come next.
      </p>
    </>
  );
}

export default function ServersPage() {
  return (
    <Shell>
      <Suspense
        fallback={
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-500">
            Loading servers...
          </div>
        }
      >
        <ServersContent />
      </Suspense>
    </Shell>
  );
}
