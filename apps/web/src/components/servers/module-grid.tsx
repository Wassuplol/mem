"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Settings2, ShieldCheck, X } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { EDITABLE_IDS } from "@/lib/module-config";
import { useSystem } from "@/lib/system";
import type { GuildModuleState } from "@/lib/guild-detail";

type Value = boolean | number | string | null;

interface EditorField {
  path: string;
  label: string;
  type: "boolean" | "number" | "channel" | "role" | "text";
  min?: number;
  max?: number;
  help?: string;
  value: Value;
}

interface EditorData {
  id: string;
  title: string;
  blurb: string;
  configured: boolean;
  fields: EditorField[];
}

interface Pickers {
  channels: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}

function updatedLabel(iso: string | null): string {
  if (!iso) return "Configured";
  const d = new Date(iso);
  return `Updated ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

export function ModuleGrid({
  guildId,
  joined,
  modules,
}: {
  guildId: string;
  joined: boolean;
  modules: GuildModuleState[];
}) {
  const [configured, setConfigured] = useState<Set<string>>(() => new Set(modules.map((m) => m.id)));
  const [stamps, setStamps] = useState<Map<string, string>>(
    () => new Map(modules.filter((m) => m.updatedAt).map((m) => [m.id, m.updatedAt as string])),
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorData | null>(null);
  const [values, setValues] = useState<Record<string, Value>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickers, setPickers] = useState<Pickers | null>(null);
  const [pickerState, setPickerState] = useState<"idle" | "loading" | "error">("idle");
  const setModalOpen = useSystem((s) => s.setModalOpen);

  const setModalDom = useCallback((on: boolean) => {
    if (typeof document !== "undefined") document.documentElement.classList.toggle("mem-modal-open", on);
  }, []);

  useEffect(
    () => () => {
      setModalOpen(false);
      setModalDom(false);
    },
    [setModalOpen, setModalDom],
  );

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2600);
    return () => clearTimeout(t);
  }, [flash]);

  const loadPickers = useCallback(async () => {
    if (pickers || pickerState === "loading") return;
    setPickerState("loading");
    try {
      const res = await fetch(`/api/guilds/${guildId}/channels`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPickers((await res.json()) as Pickers);
      setPickerState("idle");
    } catch {
      setPickerState("error");
    }
  }, [guildId, pickers, pickerState]);

  const openEditor = useCallback(
    async (moduleId: string) => {
      setOpenId(moduleId);
      setModalOpen(true);
      setModalDom(true);
      setEditor(null);
      setValues({});
      setDirty(new Set());
      setError(null);
      setFlash(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/modules/${moduleId}`, { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as EditorData;
        setEditor(data);
        setValues(Object.fromEntries(data.fields.map((f) => [f.path, f.value])));
        if (data.fields.some((f) => f.type === "channel" || f.type === "role")) void loadPickers();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load settings.");
      } finally {
        setLoading(false);
      }
    },
    [guildId, loadPickers],
  );

  const close = useCallback(() => {
    setModalOpen(false);
    setModalDom(false);
    setOpenId(null);
    setEditor(null);
    setDirty(new Set());
    setError(null);
  }, []);

  const setValue = (path: string, v: Value) => {
    setValues((prev) => ({ ...prev, [path]: v }));
    setDirty((prev) => new Set(prev).add(path));
  };

  const save = async () => {
    if (!editor || !openId) return;
    const payload: Record<string, Value> = {};
    for (const path of dirty) {
      const field = editor.fields.find((f) => f.path === path);
      const v = values[path] ?? null;
      if (field?.type === "number" && typeof v !== "number") {
        setError(`"${field.label}" needs a number.`);
        return;
      }
      payload[path] = v;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/modules/${openId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: payload }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; editor?: EditorData };
      if (!res.ok || !data.editor) throw new Error(data.error ?? `Save failed (HTTP ${res.status})`);
      setEditor(data.editor);
      setValues(Object.fromEntries(data.editor.fields.map((f) => [f.path, f.value])));
      setDirty(new Set());
      setConfigured((prev) => new Set(prev).add(openId));
      setStamps((prev) => new Map(prev).set(openId, new Date().toISOString()));
      setFlash("Saved — synced to Mem instantly ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const editorOpen = openId !== null;

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const isConfigured = configured.has(m.id);
          const editable = joined && m.status === "live" && EDITABLE_IDS.has(m.id);
          const inner = (
            <>
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
                    {editable && (
                      <span className="ml-auto flex items-center gap-1 rounded-md border border-violet-400/25 bg-violet-400/[0.07] px-1.5 py-0.5 text-[10px] font-medium text-violet-200">
                        <Settings2 className="h-3 w-3" /> tune
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-400">{m.description}</p>
                  {m.status === "live" && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px]">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          !joined ? "bg-zinc-600" : isConfigured ? "bg-emerald-400" : "bg-zinc-600"
                        }`}
                      />
                      <span className={!joined ? "text-zinc-600" : isConfigured ? "text-emerald-200/90" : "text-zinc-500"}>
                        {!joined
                          ? "Live once Mem joins"
                          : isConfigured
                            ? updatedLabel(stamps.get(m.id) ?? null)
                            : "Default settings"}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </>
          );
          return (
            <li key={m.id}>
              {editable ? (
                <button
                  type="button"
                  onClick={() => void openEditor(m.id)}
                  className="glass card-lift animate-fade-up block w-full rounded-2xl p-5 text-left transition hover:border-violet-400/30"
                >
                  {inner}
                </button>
              ) : (
                <div
                  className={`glass card-lift animate-fade-up rounded-2xl p-5 ${m.status === "soon" ? "opacity-70" : ""}`}
                >
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11.5px] leading-relaxed text-zinc-600">
        Click a <span className="text-violet-300">tune</span> card to set it up here — changes apply to Mem
        instantly and only ever to <span className="text-zinc-400">this server</span>. Everything else lives in{" "}
        <code className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono">/help</code> in
        Discord.
      </p>

      {/* editor drawer */}
      {editorOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <div className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0a0a11]/95 p-6 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-hud text-[10px] uppercase tracking-[0.2em] text-zinc-600">Module settings</p>
                <h3 className="font-display mt-1 text-xl font-bold tracking-tight">{editor?.title ?? "…"}</h3>
                {editor && <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">{editor.blurb}</p>}
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-white/10 p-2 text-zinc-400 transition hover:border-white/25 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] text-zinc-500">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
              Scoped to guild <span className="font-mono text-zinc-400">{guildId}</span> — other servers are never touched.
            </p>

            {loading && (
              <div className="mt-10 flex items-center justify-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
              </div>
            )}

            {!loading && error && (
              <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/[0.06] px-4 py-3 text-[12.5px] text-rose-200">
                {error}
              </div>
            )}

            {!loading && editor && (
              <div className="mt-6 space-y-5">
                {editor.fields.map((f) => (
                  <div key={f.path} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[12.5px] font-medium text-zinc-300">{f.label}</label>
                      {f.type === "boolean" && (
                        <button
                          type="button"
                          aria-pressed={!!values[f.path]}
                          onClick={() => setValue(f.path, !values[f.path])}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                            values[f.path] ? "bg-emerald-500/80" : "bg-white/10"
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                              values[f.path] ? "left-6" : "left-1"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                    {f.type === "number" && (
                      <input
                        type="number"
                        min={f.min}
                        max={f.max}
                        value={typeof values[f.path] === "number" ? (values[f.path] as number) : ""}
                        onChange={(e) => setValue(f.path, e.target.value === "" ? null : Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-violet-400/40"
                      />
                    )}
                    {(f.type === "channel" || f.type === "role") && (
                      <select
                        value={typeof values[f.path] === "string" ? (values[f.path] as string) : ""}
                        onChange={(e) => setValue(f.path, e.target.value === "" ? null : e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0c0c14] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-violet-400/40"
                      >
                        <option value="">{f.type === "channel" ? "— none / disabled —" : "— none —"}</option>
                        {pickerState === "loading" && <option value="">loading…</option>}
                        {pickerState === "error" && typeof values[f.path] === "string" && (
                          <option value={values[f.path] as string}>{values[f.path] as string}</option>
                        )}
                        {(f.type === "channel" ? pickers?.channels : pickers?.roles)?.map((o) => (
                          <option key={o.id} value={o.id}>
                            {f.type === "channel" ? "#" : "@"}
                            {o.name}
                          </option>
                        ))}
                        {typeof values[f.path] === "string" &&
                          !(f.type === "channel" ? pickers?.channels : pickers?.roles)?.some((o) => o.id === values[f.path]) &&
                          !(pickerState !== "idle") && <option value={values[f.path] as string}>(current) {values[f.path] as string}</option>}
                      </select>
                    )}
                    {f.type === "text" && (
                      <textarea
                        rows={3}
                        value={typeof values[f.path] === "string" ? (values[f.path] as string) : ""}
                        onChange={(e) => setValue(f.path, e.target.value)}
                        className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-violet-400/40"
                      />
                    )}
                    {(f.help || (f.type === "number" && f.min !== undefined)) && (
                      <p className="text-[11px] text-zinc-600">
                        {f.help}
                        {f.type === "number" && f.min !== undefined && f.max !== undefined ? ` (${f.min}–${f.max})` : ""}
                      </p>
                    )}
                  </div>
                ))}

                <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center gap-3 border-t border-white/10 bg-[#0a0a11]/95 px-6 py-4 backdrop-blur">
                  <button
                    type="button"
                    disabled={saving || dirty.size === 0}
                    onClick={() => void save()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {saving ? "Saving…" : dirty.size > 0 ? `Save ${dirty.size} change${dirty.size > 1 ? "s" : ""}` : "Saved"}
                  </button>
                  {flash && <span className="animate-fade-up text-[12px] font-medium text-emerald-300">{flash}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
