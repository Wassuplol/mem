/**
 * Editable module settings for the dashboard.
 * Values live in `guild_settings` (per guild+module) — the SAME table the bot
 * reads at event time, so dashboard edits sync instantly, and are guild-scoped
 * by construction (composite primary key guild_id + module_id).
 */

export type FieldType = "boolean" | "number" | "channel" | "role" | "text";

export interface ModuleField {
  path: string; // dot path into the module config, e.g. "antispam.max" or "channelId"
  label: string;
  type: FieldType;
  min?: number;
  max?: number;
  help?: string;
}

export interface EditableModule {
  id: string;
  title: string;
  blurb: string;
  fields: ModuleField[];
}

export const EDITABLE_MODULES: EditableModule[] = [
  {
    id: "security",
    title: "Security",
    blurb: "Anti-spam, anti-raid, anti-nuke and screening thresholds — every number set per server.",
    fields: [
      { path: "alertChannelId", label: "Alert channel", type: "channel", help: "Where security alerts are posted." },
      { path: "antispam.enabled", label: "Anti-spam", type: "boolean" },
      { path: "antispam.max", label: "Spam · messages", type: "number", min: 3, max: 100 },
      { path: "antispam.windowSec", label: "Spam · window (seconds)", type: "number", min: 3, max: 120 },
      { path: "antispam.timeoutMin", label: "Spam · timeout (minutes)", type: "number", min: 1, max: 1440 },
      { path: "antiraid.enabled", label: "Anti-raid", type: "boolean" },
      { path: "antiraid.joins", label: "Raid · joins", type: "number", min: 3, max: 200 },
      { path: "antiraid.windowSec", label: "Raid · window (seconds)", type: "number", min: 5, max: 300 },
      { path: "antinuke.enabled", label: "Anti-nuke", type: "boolean" },
      { path: "antinuke.actions", label: "Nuke · actions", type: "number", min: 2, max: 50 },
      { path: "antinuke.windowSec", label: "Nuke · window (seconds)", type: "number", min: 5, max: 300 },
      { path: "screening.enabled", label: "Account screening", type: "boolean", help: "Kick fresh accounts on join." },
      { path: "screening.minAgeDays", label: "Screening · min age (days)", type: "number", min: 1, max: 90 },
    ],
  },
  {
    id: "leveling",
    title: "Leveling",
    blurb: "XP rates and announcements for this server. The 5L²+50L+100 curve is shared; the numbers are yours.",
    fields: [
      { path: "enabled", label: "XP gain", type: "boolean" },
      { path: "xpMin", label: "XP min per message", type: "number", min: 1, max: 100 },
      { path: "xpMax", label: "XP max per message", type: "number", min: 1, max: 200 },
      { path: "cooldownSec", label: "Cooldown (seconds)", type: "number", min: 5, max: 3600 },
      { path: "announceChannelId", label: "Level-up channel", type: "channel", help: "Leave empty to disable announcements." },
    ],
  },
  {
    id: "welcome",
    title: "Welcome",
    blurb: "Welcome card channel + message. Placeholders: {user} {server} {count}.",
    fields: [
      { path: "channelId", label: "Welcome channel", type: "channel" },
      { path: "message", label: "Message", type: "text", help: "Placeholders: {user} {server} {count} — empty restores the default." },
    ],
  },
  {
    id: "logging",
    title: "Logging",
    blurb: "One channel for bans, deleted messages, joins and leaves.",
    fields: [{ path: "channelId", label: "Log channel", type: "channel" }],
  },
  {
    id: "tickets",
    title: "Tickets",
    blurb: "Staff role and log channel for support tickets. The panel is posted from Discord.",
    fields: [
      { path: "staffRoleId", label: "Staff role", type: "role" },
      { path: "logChannelId", label: "Log channel", type: "channel" },
      { path: "panelChannelId", label: "Panel channel", type: "channel", help: "Where /ticket panel was posted." },
    ],
  },
];

export const EDITABLE_IDS = new Set(EDITABLE_MODULES.map((m) => m.id));

/** Mirror of the bot-side defaults (apps/bot/src/modules/*) for display when unset. */
const SECURITY_DEFAULTS = {
  antispam: { enabled: true, max: 10, windowSec: 8, timeoutMin: 10 },
  antiraid: { enabled: true, joins: 10, windowSec: 30 },
  antinuke: { enabled: true, actions: 4, windowSec: 15 },
  screening: { enabled: false, minAgeDays: 7 },
};

const DEFAULTS: Record<string, Record<string, unknown>> = {
  security: SECURITY_DEFAULTS,
  leveling: { enabled: true, xpMin: 15, xpMax: 25, cooldownSec: 60 },
};

/** Normalizes legacy shapes (booleans) into objects and fills display defaults. */
export function normalizeForEditor(moduleId: string, cfg: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(DEFAULTS[moduleId] ?? {}), ...cfg };
  if (moduleId === "security") {
    const fold = (key: keyof typeof SECURITY_DEFAULTS) => {
      const def: Record<string, unknown> = { ...SECURITY_DEFAULTS[key] };
      const v = out[key];
      if (typeof v === "boolean") out[key] = { ...def, enabled: v };
      else if (v && typeof v === "object") out[key] = { ...def, ...(v as Record<string, unknown>) };
      else out[key] = def;
    };
    fold("antispam");
    fold("antiraid");
    fold("antinuke");
    const screening = out.screening;
    out.screening =
      screening && typeof screening === "object"
        ? { ...SECURITY_DEFAULTS.screening, ...(screening as Record<string, unknown>) }
        : { ...SECURITY_DEFAULTS.screening };
  }
  return out;
}

export function getPath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let cur = obj;
  for (let idx = 0; idx < keys.length - 1; idx += 1) {
    const key = keys[idx] as string;
    const next = cur[key];
    if (!next || typeof next !== "object") cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1] as string] = value;
}

const SNOWFLAKE = /^\d{5,25}$/;

export type CoerceResult = { ok: true; clean: Record<string, unknown> } | { ok: false; error: string };

/** Validates incoming dashboard values against the module's field schema. */
export function coerceValues(moduleId: string, values: Record<string, unknown>): CoerceResult {
  const mod = EDITABLE_MODULES.find((m) => m.id === moduleId);
  if (!mod) return { ok: false, error: "not_editable" };
  const clean: Record<string, unknown> = {};
  for (const [path, raw] of Object.entries(values)) {
    const field = mod.fields.find((f) => f.path === path);
    if (!field) return { ok: false, error: `unknown_field:${path}` };
    if (field.type === "boolean") {
      if (typeof raw !== "boolean") return { ok: false, error: `bad_type:${path}` };
      clean[path] = raw;
    } else if (field.type === "number") {
      if (typeof raw !== "number" || !Number.isFinite(raw)) return { ok: false, error: `bad_type:${path}` };
      const n = Math.trunc(raw);
      if (field.min !== undefined && n < field.min) return { ok: false, error: `out_of_range:${path}` };
      if (field.max !== undefined && n > field.max) return { ok: false, error: `out_of_range:${path}` };
      clean[path] = n;
    } else if (field.type === "channel" || field.type === "role") {
      if (raw !== null && (typeof raw !== "string" || !SNOWFLAKE.test(raw))) return { ok: false, error: `bad_id:${path}` };
      clean[path] = raw;
    } else {
      if (typeof raw !== "string" || raw.length > 1000) return { ok: false, error: `bad_text:${path}` };
      clean[path] = raw.trim() === "" ? null : raw;
    }
  }
  return { ok: true, clean };
}
