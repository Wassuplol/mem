import { NextResponse } from "next/server";
import { authorizeGuild } from "@/lib/guild-authz";
import { services } from "@/lib/db-services";
import { coerceValues, EDITABLE_MODULES, getPath, normalizeForEditor, setPath } from "@/lib/module-config";

/**
 * GET /api/guilds/[id]/modules/[moduleId]
 * Session-authed (Manage Server) editor payload for ONE guild's module config.
 * PUT
 * Validates + merges changes into `guild_settings` for THAT guild only.
 */

type Params = { params: Promise<{ id: string; moduleId: string }> };

async function loadEditor(guildId: string, moduleId: string) {
  const mod = EDITABLE_MODULES.find((m) => m.id === moduleId);
  if (!mod) return null;
  const raw = (await services.getModuleConfig<Record<string, unknown>>(guildId, moduleId)) ?? {};
  const normalized = normalizeForEditor(moduleId, raw);
  return {
    id: mod.id,
    title: mod.title,
    blurb: mod.blurb,
    configured: Object.keys(raw).length > 0,
    fields: mod.fields.map((f) => ({ ...f, value: getPath(normalized, f.path) ?? null })),
  };
}

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const { id, moduleId } = await params;
  const authz = await authorizeGuild(id);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });
  const editor = await loadEditor(id, moduleId);
  if (!editor) return NextResponse.json({ error: "not_editable" }, { status: 404 });
  return NextResponse.json(editor);
}

export async function PUT(request: Request, { params }: Params): Promise<Response> {
  const { id, moduleId } = await params;
  const authz = await authorizeGuild(id);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const body = (await request.json().catch(() => null)) as { values?: Record<string, unknown> } | null;
  const values = body?.values;
  if (!values || typeof values !== "object") {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  const coerced = coerceValues(moduleId, values);
  if (!coerced.ok) return NextResponse.json({ error: coerced.error }, { status: 400 });

  // Merge into this guild's existing config only (guild-scoped by construction).
  const raw = (await services.getModuleConfig<Record<string, unknown>>(id, moduleId)) ?? {};
  const base = normalizeForEditor(moduleId, raw);
  for (const [path, value] of Object.entries(coerced.clean)) setPath(base, path, value);
  await services.setModuleConfig(id, moduleId, base);

  const editor = await loadEditor(id, moduleId);
  return NextResponse.json({ ok: true, updatedAt: new Date().toISOString(), editor });
}
