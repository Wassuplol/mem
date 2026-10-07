export type ModuleStatus = "planned" | "building" | "live";

export interface ModuleInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  status: ModuleStatus;
}

export const MODULES: ModuleInfo[] = [
  { id: "moderation", name: "Moderation", emoji: "🔨", description: "Warns, timeouts, bans, case history, escalation ladders.", status: "planned" },
  { id: "automod", name: "Automod", emoji: "🚫", description: "Spam, links, invites, caps, mention storms - with allowlists.", status: "planned" },
  { id: "security", name: "Security", emoji: "🛡️", description: "Anti-nuke with rollback, anti-raid, verification gates.", status: "planned" },
  { id: "logging", name: "Logging", emoji: "📜", description: "Full audit trail: messages, members, roles, voice - per-channel.", status: "planned" },
  { id: "roles", name: "Roles & Onboarding", emoji: "🎭", description: "Reaction roles, autoroles, welcome & leave messages.", status: "planned" },
  { id: "leveling", name: "Leveling", emoji: "📈", description: "XP for chat & voice, role rewards, leaderboards.", status: "planned" },
  { id: "tickets", name: "Tickets & Modmail", emoji: "🎫", description: "Support panels, transcripts, modmail threads.", status: "planned" },
  { id: "utility", name: "Utility", emoji: "🧰", description: "Custom commands, embed builder, scheduled sends, polls.", status: "planned" },
  { id: "music", name: "Music", emoji: "🎵", description: "Lavalink-powered playback (plugin, P5).", status: "planned" },
  { id: "ai", name: "AI", emoji: "🤖", description: "Bring-your-own OpenAI-compatible endpoint: chat, summaries, mod assist.", status: "planned" },
];
