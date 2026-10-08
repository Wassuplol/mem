import {
  AuditLogEvent,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildAuditLogsEntry,
  type Guild,
  type GuildMember,
  type Message,
  type TextChannel,
} from "discord.js";
import { defineModule } from "@mem/core";
import { COLORS, embed, type EmbedBuilder } from "../lib/embed";
import { ensureGuild, ephemeral, requirePermissions, UserError } from "../lib/permissions";
import { services } from "../lib/services";

/* ------------------------------------------------------------------ *
 *  Security suite v1 — anti-raid, anti-spam, anti-nuke, screening,
 *  quarantine (strip/restore) and one-switch lockdown. RAM-bounded.
 * ------------------------------------------------------------------ */

type LockdownSnapshot = { id: string; allow: string | null; deny: string | null };

type AntiSpamCfg = { enabled: boolean; max: number; windowSec: number; timeoutMin: number };
type AntiRaidCfg = { enabled: boolean; joins: number; windowSec: number };
type AntiNukeCfg = { enabled: boolean; actions: number; windowSec: number };

type SecurityConfig = {
  alertChannelId?: string | null;
  /** Legacy boolean or full per-server thresholds. */
  antispam?: boolean | AntiSpamCfg;
  antiraid?: boolean | AntiRaidCfg;
  antinuke?: boolean | AntiNukeCfg;
  screening?: { enabled: boolean; minAgeDays: number };
  trust?: string[];
  quarantined?: Array<{ userId: string; roleIds: string[]; at: string }>;
  lockdown?: { active: boolean; at: string; reason: string; channels: LockdownSnapshot[] } | null;
};

/** Defaults only — every number is per-server overridable via /security. */
const DEFAULT_SPAM: AntiSpamCfg = { enabled: true, max: 10, windowSec: 8, timeoutMin: 10 };
const DEFAULT_RAID: AntiRaidCfg = { enabled: true, joins: 10, windowSec: 30 };
const DEFAULT_NUKE: AntiNukeCfg = { enabled: true, actions: 4, windowSec: 15 };
const NUKE_COOLDOWN_MS = 30_000; // internal alert re-fire cooldown (not a user threshold)
const DEFAULT_MIN_AGE_DAYS = 7;
const MAX_LOCK_CHANNELS = 200;

const asBool = (v: boolean | undefined): boolean => v !== false;

function spamCfg(cfg: SecurityConfig): AntiSpamCfg {
  const v = cfg.antispam;
  if (typeof v === "object" && v !== null) {
    return {
      enabled: asBool(v.enabled),
      max: v.max ?? DEFAULT_SPAM.max,
      windowSec: v.windowSec ?? DEFAULT_SPAM.windowSec,
      timeoutMin: v.timeoutMin ?? DEFAULT_SPAM.timeoutMin,
    };
  }
  return { ...DEFAULT_SPAM, enabled: asBool(v) };
}
function raidCfg(cfg: SecurityConfig): AntiRaidCfg {
  const v = cfg.antiraid;
  if (typeof v === "object" && v !== null) {
    return { enabled: asBool(v.enabled), joins: v.joins ?? DEFAULT_RAID.joins, windowSec: v.windowSec ?? DEFAULT_RAID.windowSec };
  }
  return { ...DEFAULT_RAID, enabled: asBool(v) };
}
function nukeCfg(cfg: SecurityConfig): AntiNukeCfg {
  const v = cfg.antinuke;
  if (typeof v === "object" && v !== null) {
    return { enabled: asBool(v.enabled), actions: v.actions ?? DEFAULT_NUKE.actions, windowSec: v.windowSec ?? DEFAULT_NUKE.windowSec };
  }
  return { ...DEFAULT_NUKE, enabled: asBool(v) };
}

/* ---------- bounded in-memory state ---------- */

const spamWindows = new Map<string, number[]>();
const spamMutedUntil = new Map<string, number>();
const joinWindows = new Map<string, number[]>();
const nukeWindows = new Map<string, { ts: number[]; alertedAt: number }>();

function pushWindow(map: Map<string, number[]>, key: string, now: number, windowMs: number): number {
  const arr = map.get(key) ?? [];
  const next = arr.filter((t) => now - t < windowMs);
  next.push(now);
  map.set(key, next);
  return next.length;
}

async function loadConfig(guildId: string): Promise<SecurityConfig> {
  return (await services.getModuleConfig<SecurityConfig>(guildId, "security")) ?? {};
}

async function sendAlert(guild: Guild, cfg: SecurityConfig, data: { title: string; description: string; footer?: string }): Promise<void> {
  if (!cfg.alertChannelId) return;
  const channel = await guild.channels.fetch(cfg.alertChannelId).catch(() => null);
  if (!channel?.isSendable()) return;
  const built: EmbedBuilder = embed({ color: COLORS.error, title: data.title, description: data.description });
  if (data.footer) built.setFooter({ text: data.footer });
  await channel.send({ embeds: [built], allowedMentions: { parse: [] } }).catch(() => undefined);
}

const bitFrom = (allow: bigint, deny: bigint, flag: bigint): boolean | null =>
  (allow & flag) === flag ? true : (deny & flag) === flag ? false : null;

/* ---------- events ---------- */

async function onMemberAdd(member: GuildMember): Promise<void> {
  if (member.user.bot) return;
  const cfg = await loadConfig(member.guild.id);
  const now = Date.now();

  // Screening: kick accounts younger than the threshold.
  const screening = cfg.screening;
  if (screening?.enabled) {
    const ageDays = (now - member.user.createdTimestamp) / 86_400_000;
    if (ageDays < screening.minAgeDays) {
      const kicked = await member.kick(`Account screening: ${Math.floor(ageDays)}d old (< ${screening.minAgeDays}d)`).then(() => true).catch(() => false);
      await sendAlert(member.guild, cfg, {
        title: "🚪 Young account screened",
        description: [
          `${member.user.tag} (<@${member.id}>) joined with an account only **${Math.floor(ageDays)} day(s)** old.`,
          kicked ? "🦶 Kicked automatically." : "⚠️ Could not kick (check my permissions).",
        ].join("\n"),
        footer: `Created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
      });
      if (kicked) return;
    }
  }

  // Anti-raid: join velocity.
  const raid = raidCfg(cfg);
  if (raid.enabled) {
    const count = pushWindow(joinWindows, member.guild.id, now, raid.windowSec * 1000);
    if (count === raid.joins) {
      await sendAlert(member.guild, cfg, {
        title: "🚨 Possible raid detected",
        description: [
          `**${count} members joined in ${raid.windowSec}s.**`,
          `Latest: ${member.user.tag} (<@${member.id}>, account <t:${Math.floor(member.user.createdTimestamp / 1000)}:R> old).`,
          "",
          "If this is an attack: `/lockdown start` immediately. Consider enabling screening: `/security screening on`.",
        ].join("\n"),
      });
    }
  }
}

async function onMessageCreate(message: Message): Promise<void> {
  if (!message.inGuild() || message.author.bot || message.system) return;
  const member = message.member;
  if (!member) return;
  const cfg = await loadConfig(message.guild.id);
  const spam = spamCfg(cfg);
  if (!spam.enabled) return;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  if ((spamMutedUntil.get(key) ?? 0) > now) return;

  const count = pushWindow(spamWindows, key, now, spam.windowSec * 1000);
  if (count < spam.max) return;

  spamWindows.delete(key);
  spamMutedUntil.set(key, now + 60_000);
  if (spamMutedUntil.size > 5000) spamMutedUntil.clear();

  const timedOut = await member
    .timeout(spam.timeoutMin * 60_000, `Anti-spam: ${count} messages in ${spam.windowSec}s`)
    .then(() => true)
    .catch(() => false);

  await sendAlert(message.guild, cfg, {
    title: "🛡️ Anti-spam triggered",
    description: [
      `${message.author.tag} (<@${message.author.id}>) sent **${count} messages in ${spam.windowSec}s** in <#${message.channelId}>.`,
      timedOut ? `⏳ Timed out for **${spam.timeoutMin} min**.` : "⚠️ Could not time them out (check my permissions).",
    ].join("\n"),
  });
}

const NUKE_LABELS: Partial<Record<AuditLogEvent, string>> = {
  [AuditLogEvent.ChannelDelete]: "deleted a channel",
  [AuditLogEvent.RoleDelete]: "deleted a role",
  [AuditLogEvent.MemberBanAdd]: "banned a member",
  [AuditLogEvent.MemberKick]: "kicked a member",
  [AuditLogEvent.WebhookCreate]: "created a webhook",
};

async function onAuditEntry(entry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
  if (!(entry.action in NUKE_LABELS)) return;
  const actorId = entry.executorId;
  if (!actorId || actorId === guild.ownerId || actorId === guild.client.user.id) return;
  const cfg = await loadConfig(guild.id);
  const nuke = nukeCfg(cfg);
  if (!nuke.enabled) return;
  if (cfg.trust?.includes(actorId)) return;

  const key = `${guild.id}:${actorId}`;
  const now = Date.now();
  const state = nukeWindows.get(key) ?? { ts: [], alertedAt: 0 };
  state.ts = state.ts.filter((t) => now - t < nuke.windowSec * 1000);
  state.ts.push(now);
  nukeWindows.set(key, state);
  if (nukeWindows.size > 2000) nukeWindows.clear();

  if (state.ts.length >= nuke.actions && now - state.alertedAt > NUKE_COOLDOWN_MS) {
    state.alertedAt = now;
    await sendAlert(guild, cfg, {
      title: "🚨 Possible nuke detected",
      description: [
        `<@${actorId}> performed **${state.ts.length} destructive actions in ${nuke.windowSec}s** (last: ${NUKE_LABELS[entry.action] ?? "destructive action"}).`,
        "",
        "Immediate options:",
        "• `/lockdown start` — lock every channel",
        "• `/security strip` — remove their roles now",
        `• \`/security trust add\` — whitelist if this is a trusted admin`,
      ].join("\n"),
      footer: "Anti-nuke watched: channel/role deletes, bans, kicks, webhook creates",
    });
  }
}

/* ---------- lockdown ---------- */

async function engageLockdown(guild: Guild, reason: string): Promise<{ locked: number; snaps: LockdownSnapshot[] }> {
  const channels = [...guild.channels.cache.values()].filter(
    (c): c is TextChannel => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement,
  ).slice(0, MAX_LOCK_CHANNELS);

  const everyone = guild.roles.everyone;
  const saved: LockdownSnapshot[] = [];
  for (let k = 0; k < channels.length; k += 8) {
    const batch = channels.slice(k, k + 8);
    const results = await Promise.all(
      batch.map(async (channel) => {
        const ow = channel.permissionOverwrites.cache.get(everyone.id);
        const snap: LockdownSnapshot = {
          id: channel.id,
          allow: ow ? ow.allow.bitfield.toString() : null,
          deny: ow ? ow.deny.bitfield.toString() : null,
        };
        const ok = await channel.permissionOverwrites
          .edit(everyone, { SendMessages: false, SendMessagesInThreads: false }, { reason: `Lockdown: ${reason}` })
          .then(() => true)
          .catch(() => false);
        return ok ? snap : null;
      }),
    );
    for (const r of results) if (r) saved.push(r);
  }
  return { locked: saved.length, snaps: saved };
}

async function liftLockdown(guild: Guild, snaps: LockdownSnapshot[]): Promise<number> {
  const everyone = guild.roles.everyone;
  let restored = 0;
  for (let k = 0; k < snaps.length; k += 8) {
    const batch = snaps.slice(k, k + 8);
    const results = await Promise.all(
      batch.map(async (snap) => {
        const channel = guild.channels.cache.get(snap.id);
        if (!channel || !("permissionOverwrites" in channel)) return false;
        if (snap.allow === null && snap.deny === null) {
          return channel.permissionOverwrites.delete(guild.roles.everyone).then(() => true).catch(() => false);
        }
        const allow = BigInt(snap.allow ?? "0");
        const deny = BigInt(snap.deny ?? "0");
        return channel.permissionOverwrites
          .edit(everyone, {
            SendMessages: bitFrom(allow, deny, PermissionFlagsBits.SendMessages),
            SendMessagesInThreads: bitFrom(allow, deny, PermissionFlagsBits.SendMessagesInThreads),
          }, { reason: "Lockdown lifted" })
          .then(() => true)
          .catch(() => false);
      }),
    );
    for (const ok of results) if (ok) restored += 1;
  }
  return restored;
}

/* ---------- module ---------- */

export const securityModule = defineModule({
  id: "security",
  name: "Security",
  version: "0.1.0",
  events: [
    { name: "guildMemberAdd", async execute(member: GuildMember) { await onMemberAdd(member); } },
    { name: "messageCreate", async execute(message: Message) { await onMessageCreate(message); } },
    { name: "guildAuditLogEntryCreate", async execute(entry: GuildAuditLogsEntry, guild: Guild) { await onAuditEntry(entry, guild); } },
  ],
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("security")
        .setDescription("Server security: anti-spam, anti-raid, anti-nuke, screening, quarantine.")
        .addSubcommand((s) => s.setName("config").setDescription("Show the security settings"))
        .addSubcommand((s) =>
          s
            .setName("alertchannel")
            .setDescription("Set (or clear) where security alerts are sent")
            .addChannelOption((o) => o.setName("channel").setDescription("Alert channel (omit to clear)")),
        )
        .addSubcommand((s) =>
          s
            .setName("antispam")
            .setDescription("Auto-timeout message floods — set your own thresholds")
            .addStringOption((o) => o.setName("state").setDescription("on / off").setRequired(true).addChoices({ name: "on", value: "on" }, { name: "off", value: "off" }))
            .addIntegerOption((o) => o.setName("max").setDescription("Messages within the window that trigger it (3-100)").setMinValue(3).setMaxValue(100))
            .addIntegerOption((o) => o.setName("window_seconds").setDescription("Counting window in seconds (3-120)").setMinValue(3).setMaxValue(120))
            .addIntegerOption((o) => o.setName("timeout_minutes").setDescription("Timeout length in minutes (1-1440)").setMinValue(1).setMaxValue(1440)),
        )
        .addSubcommand((s) =>
          s
            .setName("antiraid")
            .setDescription("Alert on join floods — set your own thresholds")
            .addStringOption((o) => o.setName("state").setDescription("on / off").setRequired(true).addChoices({ name: "on", value: "on" }, { name: "off", value: "off" }))
            .addIntegerOption((o) => o.setName("joins").setDescription("Joins within the window that trigger it (3-200)").setMinValue(3).setMaxValue(200))
            .addIntegerOption((o) => o.setName("window_seconds").setDescription("Counting window in seconds (5-300)").setMinValue(5).setMaxValue(300)),
        )
        .addSubcommand((s) =>
          s
            .setName("antinuke")
            .setDescription("Alert on mass destructive actions — set your own thresholds")
            .addStringOption((o) => o.setName("state").setDescription("on / off").setRequired(true).addChoices({ name: "on", value: "on" }, { name: "off", value: "off" }))
            .addIntegerOption((o) => o.setName("actions").setDescription("Destructive actions within the window that trigger it (2-50)").setMinValue(2).setMaxValue(50))
            .addIntegerOption((o) => o.setName("window_seconds").setDescription("Counting window in seconds (5-300)").setMinValue(5).setMaxValue(300)),
        )
        .addSubcommand((s) =>
          s
            .setName("screening")
            .setDescription("Auto-kick fresh accounts below a minimum age")
            .addStringOption((o) => o.setName("state").setDescription("on / off").setRequired(true).addChoices({ name: "on", value: "on" }, { name: "off", value: "off" }))
            .addIntegerOption((o) => o.setName("min_age_days").setDescription(`Minimum account age in days (default ${DEFAULT_MIN_AGE_DAYS})`).setMinValue(1).setMaxValue(90)),
        )
        .addSubcommand((s) => s.setName("strip").setDescription("Quarantine: strip a member of all their roles").addUserOption((o) => o.setName("user").setDescription("Member to strip").setRequired(true)))
        .addSubcommand((s) => s.setName("restore").setDescription("Restore roles of a quarantined member").addUserOption((o) => o.setName("user").setDescription("Member to restore").setRequired(true)))
        .addSubcommandGroup((g) =>
          g
            .setName("trust")
            .setDescription("Trusted users — exempt from anti-nuke")
            .addSubcommand((s) => s.setName("add").setDescription("Trust a user").addUserOption((o) => o.setName("user").setDescription("User").setRequired(true)))
            .addSubcommand((s) => s.setName("remove").setDescription("Untrust a user").addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))),
        ),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
        const cfg = await loadConfig(i.guild.id);
        const group = i.options.getSubcommandGroup(false);
        const sub = i.options.getSubcommand();

        const persist = async (msg: string) => {
          await services.setModuleConfig(i.guild.id, "security", cfg);
          await i.reply(ephemeral(msg));
        };

        if (group === "trust") {
          const user = i.options.getUser("user", true);
          const trust = new Set(cfg.trust ?? []);
          if (sub === "add") trust.add(user.id);
          else trust.delete(user.id);
          cfg.trust = [...trust];
          await persist(sub === "add" ? `✅ <@${user.id}> is now trusted (anti-nuke exempt).` : `🗑️ <@${user.id}> is no longer trusted.`);
          return;
        }

        if (sub === "config") {
          const screening = cfg.screening ?? { enabled: false, minAgeDays: DEFAULT_MIN_AGE_DAYS };
          const spam = spamCfg(cfg);
          const raid = raidCfg(cfg);
          const nuke = nukeCfg(cfg);
          const panel = embed({ color: COLORS.brand, title: "🛡️ Security settings" })
            .setDescription(
              [
                `Alert channel: ${cfg.alertChannelId ? `<#${cfg.alertChannelId}>` : "*off — set one with `/security alertchannel`*"}`,
                `Anti-spam: ${spam.enabled ? "**on**" : "off"} — **${spam.max} msgs / ${spam.windowSec}s** → **${spam.timeoutMin} min** timeout`,
                `Anti-raid: ${raid.enabled ? "**on**" : "off"} — alert at **${raid.joins} joins / ${raid.windowSec}s**`,
                `Anti-nuke: ${nuke.enabled ? "**on**" : "off"} — alert at **${nuke.actions} actions / ${nuke.windowSec}s**`,
                `Screening: ${screening.enabled ? `**on** — kicking accounts < ${screening.minAgeDays} day(s)` : "off"}`,
                `Trusted (anti-nuke): ${(cfg.trust ?? []).length} user(s)`,
                `Quarantined: ${(cfg.quarantined ?? []).length} member(s)`,
                `Lockdown: ${cfg.lockdown?.active ? `**ACTIVE** since <t:${Math.floor(new Date(cfg.lockdown.at).getTime() / 1000)}:R>` : "off"}`,
              ].join("\n"),
            )
            .setFooter({ text: "Every number is per-server — tune with /security antispam · antiraid · antinuke" });
          await i.reply({ embeds: [panel], flags: MessageFlags.Ephemeral });
          return;
        }

        if (sub === "alertchannel") {
          const channel = i.options.getChannel("channel");
          if (channel && !channel.isSendable()) throw new UserError("That channel cannot receive alerts.");
          cfg.alertChannelId = channel?.id ?? null;
          await persist(channel ? `🚨 Security alerts will go to <#${channel.id}>.` : "Security alerts disabled (no channel).");
          return;
        }

        if (sub === "antispam") {
          const cur = spamCfg(cfg);
          cfg.antispam = {
            enabled: i.options.getString("state", true) === "on",
            max: i.options.getInteger("max") ?? cur.max,
            windowSec: i.options.getInteger("window_seconds") ?? cur.windowSec,
            timeoutMin: i.options.getInteger("timeout_minutes") ?? cur.timeoutMin,
          };
          const v = cfg.antispam;
          await persist(
            `${v.enabled ? "✅" : "⭕"} Anti-spam ${v.enabled ? "**on**" : "off"} — **${v.max} msgs / ${v.windowSec}s** → **${v.timeoutMin} min** timeout.`,
          );
          return;
        }

        if (sub === "antiraid") {
          const cur = raidCfg(cfg);
          cfg.antiraid = {
            enabled: i.options.getString("state", true) === "on",
            joins: i.options.getInteger("joins") ?? cur.joins,
            windowSec: i.options.getInteger("window_seconds") ?? cur.windowSec,
          };
          const v = cfg.antiraid;
          await persist(`${v.enabled ? "✅" : "⭕"} Anti-raid ${v.enabled ? "**on**" : "off"} — alert at **${v.joins} joins / ${v.windowSec}s**.`);
          return;
        }

        if (sub === "antinuke") {
          const cur = nukeCfg(cfg);
          cfg.antinuke = {
            enabled: i.options.getString("state", true) === "on",
            actions: i.options.getInteger("actions") ?? cur.actions,
            windowSec: i.options.getInteger("window_seconds") ?? cur.windowSec,
          };
          const v = cfg.antinuke;
          await persist(`${v.enabled ? "✅" : "⭕"} Anti-nuke ${v.enabled ? "**on**" : "off"} — alert at **${v.actions} destructive actions / ${v.windowSec}s**.`);
          return;
        }

        if (sub === "screening") {
          const on = i.options.getString("state", true) === "on";
          const days = i.options.getInteger("min_age_days") ?? cfg.screening?.minAgeDays ?? DEFAULT_MIN_AGE_DAYS;
          cfg.screening = { enabled: on, minAgeDays: Math.min(Math.max(days, 1), 90) };
          await persist(on ? `👶 Screening on — accounts younger than **${cfg.screening.minAgeDays} day(s)** will be kicked on join.` : "Screening off.");
          return;
        }

        if (sub === "strip") {
          const user = i.options.getUser("user", true);
          const member = await i.guild.members.fetch(user.id).catch(() => null);
          if (!member) throw new UserError("That user is not a member of this server.");
          if (member.id === i.guild.ownerId) throw new UserError("I won't strip the server owner.");
          if (member.id === i.client.user.id) throw new UserError("I won't strip myself.");
          const me = i.guild.members.me;
          if (me && member.roles.highest.position >= me.roles.highest.position) throw new UserError("Their top role is above mine — I can't strip them.");
          const roleIds = member.roles.cache.filter((r) => r.id !== i.guild.id && !r.managed).map((r) => r.id);
          if (roleIds.length === 0) throw new UserError("They have no removable roles.");
          await member.roles.set([], `Quarantined by ${i.user.tag}`);
          cfg.quarantined = [...(cfg.quarantined ?? []).filter((q) => q.userId !== user.id), { userId: user.id, roleIds, at: new Date().toISOString() }];
          await services.setModuleConfig(i.guild.id, "security", cfg);
          await sendAlert(i.guild, cfg, { title: "⛔ Member quarantined", description: `<@${user.id}> was stripped of **${roleIds.length}** role(s) by <@${i.user.id}>.` });
          await i.reply({ embeds: [embed({ color: COLORS.warn, description: `⛔ <@${user.id}> quarantined — **${roleIds.length}** role(s) removed (they can be restored with /security restore).` })] });
          return;
        }

        if (sub === "restore") {
          const user = i.options.getUser("user", true);
          const entry = (cfg.quarantined ?? []).find((q) => q.userId === user.id);
          if (!entry) throw new UserError("That user is not in quarantine.");
          const member = await i.guild.members.fetch(user.id).catch(() => null);
          if (!member) throw new UserError("They are no longer a member — their roles stay saved.");
          const valid = entry.roleIds.filter((id) => i.guild.roles.cache.has(id));
          await member.roles.set(valid, `Restored by ${i.user.tag}`).catch(() => undefined);
          cfg.quarantined = (cfg.quarantined ?? []).filter((q) => q.userId !== user.id);
          await services.setModuleConfig(i.guild.id, "security", cfg);
          await i.reply({ embeds: [embed({ color: COLORS.success, description: `♻️ <@${user.id}> restored — **${valid.length}** role(s) back.` })] });
          return;
        }
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName("lockdown")
        .setDescription("Emergency server lockdown — freezes posting everywhere.")
        .addSubcommand((s) =>
          s
            .setName("start")
            .setDescription("Lock every channel (sends are disabled for @everyone)")
            .addStringOption((o) => o.setName("reason").setDescription("Why").setMaxLength(200)),
        )
        .addSubcommand((s) => s.setName("end").setDescription("Lift the lockdown and restore permissions")),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
        const cfg = await loadConfig(i.guild.id);
        const sub = i.options.getSubcommand();

        if (sub === "start") {
          if (cfg.lockdown?.active) throw new UserError("Lockdown is already active — use /lockdown end first.");
          await i.deferReply();
          const reason = i.options.getString("reason") ?? `by ${i.user.tag}`;
          const { locked, snaps } = await engageLockdown(i.guild, reason);
          cfg.lockdown = { active: true, at: new Date().toISOString(), reason, channels: snaps };
          await services.setModuleConfig(i.guild.id, "security", cfg);
          await sendAlert(i.guild, cfg, {
            title: "🛡 Lockdown engaged",
            description: `**${locked}** channel(s) frozen by <@${i.user.id}>.\nReason: ${reason}\nLift with: /lockdown end`,
          });
          await i.editReply(`🛡️ **Lockdown engaged** — sends disabled in **${locked}** channel(s). Lift with /lockdown end.`);
          return;
        }

        if (sub === "end") {
          if (!cfg.lockdown?.active) throw new UserError("Lockdown is not active.");
          await i.deferReply();
          const restored = await liftLockdown(i.guild, cfg.lockdown.channels);
          cfg.lockdown = null;
          await services.setModuleConfig(i.guild.id, "security", cfg);
          await i.editReply(`♻️ **Lockdown lifted** — **${restored}** channel(s) restored.`);
          return;
        }
      },
    },
  ],
});
