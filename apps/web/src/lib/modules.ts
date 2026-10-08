import {
  AlarmClock,
  BarChart3,
  Compass,
  Gift,
  HeartHandshake,
  KeyRound,
  MousePointerClick,
  Music,
  ScrollText,
  Shield,
  ShieldAlert,
  Sparkles,
  Ticket,
  Timer,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type ModuleStatus = "live" | "soon";

export interface ModuleInfo {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  status: ModuleStatus;
  commands?: number;
  accent: string; // tailwind gradient classes for the icon tile
}

export const MODULES: ModuleInfo[] = [
  {
    id: "moderation",
    name: "Moderation",
    icon: Shield,
    description: "Warn cases, timeout/mute, kick/ban, tempbans with auto-unban, purge, slowmode, role tools, case history.",
    status: "live",
    commands: 16,
    accent: "from-rose-500/25 to-orange-500/10 text-rose-300",
  },
  {
    id: "utility",
    name: "Utility",
    icon: Wrench,
    description: "Server/user info, avatars, stats, as-Mem messaging, announcements, live RAM meter.",
    status: "live",
    commands: 9,
    accent: "from-sky-500/25 to-cyan-500/10 text-sky-300",
  },
  {
    id: "logging",
    name: "Logging",
    icon: ScrollText,
    description: "Bans, deleted messages (with content), joins & leaves — one configurable channel.",
    status: "live",
    commands: 1,
    accent: "from-amber-500/25 to-yellow-500/10 text-amber-300",
  },
  {
    id: "welcome",
    name: "Welcome",
    icon: HeartHandshake,
    description: "Branded welcome cards with avatars and {user} {server} {count} templates.",
    status: "live",
    commands: 1,
    accent: "from-pink-500/25 to-fuchsia-500/10 text-pink-300",
  },
  {
    id: "roles",
    name: "Reaction roles",
    icon: MousePointerClick,
    description: "Select-menu role panels — click to toggle, live repaint, hierarchy-safe.",
    status: "live",
    commands: 1,
    accent: "from-violet-500/25 to-purple-500/10 text-violet-300",
  },
  {
    id: "polls",
    name: "Polls",
    icon: BarChart3,
    description: "Modal creation, live bar results, multi-select, auto-close with visible timers.",
    status: "live",
    commands: 1,
    accent: "from-emerald-500/25 to-teal-500/10 text-emerald-300",
  },
  {
    id: "reminders",
    name: "Reminders",
    icon: AlarmClock,
    description: "Natural durations (10m, 1h30m, 2d), channel→DM fallback, autocomplete picker.",
    status: "live",
    commands: 1,
    accent: "from-indigo-500/25 to-blue-500/10 text-indigo-300",
  },
  {
    id: "help",
    name: "Help hub",
    icon: Compass,
    description: "Type-to-search across every command — categories, pages, instant answers.",
    status: "live",
    commands: 1,
    accent: "from-cyan-500/25 to-sky-500/10 text-cyan-300",
  },
  {
    id: "giveaways",
    name: "Giveaways",
    icon: Gift,
    description: "Button entries, throttled live counter, crypto-random auto-draw, reroll that skips previous winners.",
    status: "live",
    commands: 1,
    accent: "from-rose-500/25 to-pink-500/10 text-rose-300",
  },
  {
    id: "temproles",
    name: "Temp roles",
    icon: Timer,
    description: "Grant a role for a set time - removed automatically by the durable scheduler.",
    status: "live",
    commands: 1,
    accent: "from-lime-500/25 to-emerald-500/10 text-lime-300",
  },
  {
    id: "apikeys",
    name: "API keys",
    icon: KeyRound,
    description: "Bearer keys for the public /api/v1 - hashed, guild-scoped, revocable with one click.",
    status: "live",
    commands: 1,
    accent: "from-slate-400/25 to-zinc-400/10 text-slate-300",
  },
  {
    id: "leveling",
    name: "Leveling",
    icon: Trophy,
    description: "XP for chatting, role rewards, rank cards and leaderboards.",
    status: "live",
    commands: 3,
    accent: "from-yellow-500/25 to-amber-500/10 text-yellow-300",
  },
  {
    id: "tickets",
    name: "Tickets & modmail",
    icon: Ticket,
    description: "Support panels, private threads, claim/close flows and transcripts. Modmail coming later.",
    status: "live",
    commands: 1,
    accent: "from-teal-500/25 to-emerald-500/10 text-teal-300",
  },
  {
    id: "security",
    name: "Security",
    icon: ShieldAlert,
    description: "Anti-raid, anti-spam, anti-nuke, young-account screening, quarantine and one-switch lockdown. Wick's paid edge — free here.",
    status: "live",
    commands: 2,
    accent: "from-red-500/25 to-rose-500/10 text-red-300",
  },
  {
    id: "ai",
    name: "AI",
    icon: Sparkles,
    description: "Bring-your-own OpenAI-compatible endpoint: chat, summaries, mod assist.",
    status: "soon",
    accent: "from-fuchsia-500/25 to-pink-500/10 text-fuchsia-300",
  },
  {
    id: "music",
    name: "Music",
    icon: Music,
    description: "Lavalink-powered playback with queues and filters.",
    status: "soon",
    accent: "from-purple-500/25 to-violet-500/10 text-purple-300",
  },
];

export const LIVE_MODULES = MODULES.filter((m) => m.status === "live");

/** Snapshot stats (kept in sync with the bot boot log). */
export const STATS = {
  commands: 35,
  modules: 12,
  events: 7,
  components: 4,
  roadmapDone: 39,
  roadmapTotal: 319,
};
