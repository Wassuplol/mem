import { MODULES } from "@/lib/modules";

export default function DashboardOverview() {
  const live = MODULES.filter((m) => m.status === "live").length;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Modules</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {MODULES.length} modules planned - {live} live. Configuration pages arrive with P2.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {m.emoji} {m.name}
              </span>
              <span className="text-[11px] uppercase tracking-wide rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">
                {m.status}
              </span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">{m.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
