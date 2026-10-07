import Link from "next/link";
import { AuthChip } from "@/components/auth-chip";
import { MODULES } from "@/lib/modules";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex">
        <aside className="w-64 min-h-screen border-r border-zinc-800 p-4 space-y-6 hidden md:block">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden>🧠</span> Mem
          </Link>
          <nav className="space-y-1 text-sm">
            <Link
              className="block rounded-md px-3 py-2 bg-zinc-900 text-zinc-100"
              href="/dashboard"
            >
              Overview
            </Link>
            <Link className="block rounded-md px-3 py-2 text-zinc-300 hover:bg-zinc-900 transition" href="/servers">
              Servers
            </Link>
            {MODULES.map((m) => (
              <span
                key={m.id}
                className="block rounded-md px-3 py-2 text-zinc-500 cursor-not-allowed"
                title="Coming online soon"
              >
                {m.emoji} {m.name}
              </span>
            ))}
            <span className="block rounded-md px-3 py-2 text-zinc-500 cursor-not-allowed">
              ⚙️ Settings
            </span>
          </nav>
          <p className="text-xs text-zinc-600">P1 preview - wiring in progress</p>
        </aside>
        <div className="flex-1">
          <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <div className="text-sm text-zinc-400">Dashboard preview</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-400">
                No server connected
              </span>
              <AuthChip />
            </div>
          </header>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
