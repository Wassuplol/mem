import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleKeywordPresetType,
  AutoModerationRuleTriggerType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type AutoModerationActionOptions,
  type AutoModerationRule,
  type Guild,
} from "discord.js";
import { defineModule } from "@mem/core";
import { COLORS, embed } from "../lib/embed";
import { ensureGuild, ephemeral, requirePermissions, UserError } from "../lib/permissions";
import { services } from "../lib/services";

/* ------------------------------------------------------------------ *
 *  Native AutoMod — free rule management on top of Discord's engine.
 *  Discord evaluates the rules; we create/update/remove them and keep
 *  a copy of the keyword list + settings in the module config so the
 *  dashboard and bot always agree.
 * ------------------------------------------------------------------ */

type AutoModConfig = {
  alertChannelId?: string | null;
  keywordFilter?: string[];
  mentionLimit?: number; // 0 = off
  timeoutMinutes?: number; // for "timeout" action mode
  presets?: { profanity?: boolean; sexual?: boolean; slurs?: boolean };
  spamEnabled?: boolean;
};

const RULE_PREFIX = "Mem • ";

/* Discord allows only ONE rule per trigger type — all presets live in a single
 * rule whose `presets` array carries whichever ones are enabled. */
const PRESET_VALUES = {
  profanity: AutoModerationRuleKeywordPresetType.Profanity,
  sexual: AutoModerationRuleKeywordPresetType.SexualContent,
  slurs: AutoModerationRuleKeywordPresetType.Slurs,
} as const;
type PresetKey = keyof typeof PRESET_VALUES;
const RULE_PRESETS = `${RULE_PREFIX}Presets`;

const RULE_KEYWORDS = `${RULE_PREFIX}Keywords`;
const RULE_MENTIONS = `${RULE_PREFIX}Mention Spam`;
const RULE_SPAM = `${RULE_PREFIX}Spam`;

const TRIGGER_LABELS: Record<number, string> = {
  [AutoModerationRuleTriggerType.Keyword]: "self-set words",
  [AutoModerationRuleTriggerType.Spam]: "spam content",
  [AutoModerationRuleTriggerType.KeywordPreset]: "preset list",
  [AutoModerationRuleTriggerType.MentionSpam]: "mention spam",
  [AutoModerationRuleTriggerType.MemberProfile]: "member profile",
};

/** Turns Discord API failures into something a human can act on. */
function explainApiError(e: unknown): string {
  const raw = (e as { rawError?: { errors?: { _errors?: Array<{ code?: string }> } } }).rawError;
  const code = raw?.errors?._errors?.[0]?.code;
  if (code === "AUTO_MODERATION_MAX_RULES_OF_TYPE_EXCEEDED") {
    return "Discord allows only **one** rule of that type per server and one already exists (maybe another bot made it) — remove it in Server Settings → AutoMod first, then try again.";
  }
  return "Discord rejected the change — check my Manage Server permission.";
}

async function loadConfig(guildId: string): Promise<AutoModConfig> {
  return (await services.getModuleConfig<AutoModConfig>(guildId, "automod")) ?? {};
}

function buildActions(cfg: AutoModConfig, mode: "block" | "timeout"): AutoModerationActionOptions[] {
  const actions: AutoModerationActionOptions[] = [
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { customMessage: "Blocked by Mem — that isn't allowed in this server." },
    },
  ];
  if (mode === "timeout") {
    const minutes = Math.min(Math.max(cfg.timeoutMinutes ?? 60, 1), 1440);
    actions.push({ type: AutoModerationActionType.Timeout, metadata: { durationSeconds: minutes * 60 } });
  }
  if (cfg.alertChannelId) {
    actions.push({ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: cfg.alertChannelId } });
  }
  return actions;
}

function actionMode(cfg: AutoModConfig): "block" | "timeout" {
  return (cfg.timeoutMinutes ?? 0) > 0 ? "timeout" : "block";
}

async function fetchRules(guild: Guild): Promise<AutoModerationRule[]> {
  return [...(await guild.autoModerationRules.fetch()).values()];
}

async function findRule(guild: Guild, name: string): Promise<AutoModerationRule | null> {
  const rules = await fetchRules(guild);
  return rules.find((r) => r.name === name) ?? null;
}

/** Creates or updates a rule so it matches the current config; returns the rule. */
async function upsertRule(
  guild: Guild,
  name: string,
  trigger: { triggerType: AutoModerationRuleTriggerType; triggerMetadata?: Record<string, unknown> },
  cfg: AutoModConfig,
  enabled: boolean,
): Promise<AutoModerationRule> {
  const rules = await fetchRules(guild);
  const existing = rules.find((r) => r.name === name);
  const payload = {
    name,
    eventType: AutoModerationRuleEventType.MessageSend,
    triggerType: trigger.triggerType,
    triggerMetadata: trigger.triggerMetadata ?? {},
    actions: buildActions(cfg, actionMode(cfg)),
    enabled,
  };
  if (existing) {
    return guild.autoModerationRules.edit(existing.id, payload);
  }
  return guild.autoModerationRules.create(payload);
}

async function removeRule(guild: Guild, name: string): Promise<boolean> {
  const rule = await findRule(guild, name);
  if (!rule) return false;
  await guild.autoModerationRules.delete(rule.id);
  return true;
}

const isCapError = (e: unknown): boolean => {
  const raw = (e as { rawError?: { errors?: { _errors?: Array<{ code?: string }> } } }).rawError;
  return raw?.errors?._errors?.[0]?.code === "AUTO_MODERATION_MAX_RULES_OF_TYPE_EXCEEDED";
};

/** The name of the non-Mem rule currently occupying a trigger-type slot. */
async function occupantName(guild: Guild, triggerType: AutoModerationRuleTriggerType): Promise<string | null> {
  const rules = await fetchRules(guild);
  return rules.find((r) => r.triggerType === triggerType)?.name ?? null;
}

/**
 * Adopt-aware upsert: takes over an existing rule of the same trigger type
 * (renames it into the Mem namespace) when the guild's slot is already used —
 * only ever called when the user explicitly passes adopt:true.
 */
async function upsertWithAdopt(
  guild: Guild,
  name: string,
  triggerType: AutoModerationRuleTriggerType,
  triggerMetadata: Record<string, unknown> | undefined,
  cfg: AutoModConfig,
): Promise<{ adopted?: string }> {
  const rules = await fetchRules(guild);
  const named = rules.find((r) => r.name === name);
  if (named) {
    await guild.autoModerationRules.edit(named.id, {
      triggerMetadata: triggerMetadata ?? {},
      actions: buildActions(cfg, actionMode(cfg)),
      enabled: true,
    });
    return {};
  }
  const occupant = rules.find((r) => r.triggerType === triggerType);
  if (occupant) {
    const newName = occupant.name.startsWith(RULE_PREFIX) ? occupant.name : `${RULE_PREFIX}${occupant.name}`;
    await guild.autoModerationRules.edit(occupant.id, {
      name: newName,
      triggerMetadata: triggerMetadata ?? {},
      actions: buildActions(cfg, actionMode(cfg)),
      enabled: true,
    });
    return { adopted: occupant.name };
  }
  await guild.autoModerationRules.create({
    name,
    eventType: AutoModerationRuleEventType.MessageSend,
    triggerType,
    triggerMetadata: triggerMetadata ?? {},
    actions: buildActions(cfg, actionMode(cfg)),
    enabled: true,
  });
  return {};
}

/** Creates/updates/removes the single consolidated preset rule. */
async function syncPresets(guild: Guild, cfg: AutoModConfig, adopt = false): Promise<{ adopted?: string }> {
  const flags = cfg.presets ?? {};
  const values = (Object.keys(PRESET_VALUES) as PresetKey[]).filter((k) => flags[k]).map((k) => PRESET_VALUES[k]);
  if (values.length === 0) {
    await removeRule(guild, RULE_PRESETS);
    return {};
  }
  if (adopt) {
    return upsertWithAdopt(
      guild,
      RULE_PRESETS,
      AutoModerationRuleTriggerType.KeywordPreset,
      { presets: values },
      cfg,
    );
  }
  await upsertRule(
    guild,
    RULE_PRESETS,
    { triggerType: AutoModerationRuleTriggerType.KeywordPreset, triggerMetadata: { presets: values } },
    cfg,
    true,
  );
  return {};
}

async function resyncAll(guild: Guild, cfg: AutoModConfig): Promise<void> {
  const memRules = (await fetchRules(guild)).filter((r) => r.name.startsWith(RULE_PREFIX));
  for (const rule of memRules) {
    await guild.autoModerationRules
      .edit(rule.id, { actions: buildActions(cfg, actionMode(cfg)) })
      .catch(() => undefined);
  }
}

export const automodModule = defineModule({
  id: "automod",
  name: "AutoMod",
  version: "0.1.0",
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("automod")
        .setDescription("Native Discord AutoMod rules — presets, words, mentions, spam. Free.")
        .addSubcommand((s) =>
          s
            .setName("enable")
            .setDescription("Turn on preset filtering")
            .addStringOption((o) =>
              o
                .setName("preset")
                .setDescription("Which preset")
                .setRequired(true)
                .addChoices(
                  { name: "profanity", value: "profanity" },
                  { name: "sexual content", value: "sexual" },
                  { name: "slurs", value: "slurs" },
                  { name: "all three", value: "all" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("action")
                .setDescription("What happens to blocked messages (default: block only)")
                .addChoices({ name: "block only", value: "block" }, { name: "block + timeout 60 min", value: "timeout" }),
            )
            .addBooleanOption((o) =>
              o.setName("adopt").setDescription("Take over an existing same-type rule (Discord allows only one)"),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("disable")
            .setDescription("Turn off preset rules (or everything)")
            .addStringOption((o) =>
              o
                .setName("preset")
                .setDescription("Which preset")
                .setRequired(true)
                .addChoices(
                  { name: "profanity", value: "profanity" },
                  { name: "sexual content", value: "sexual" },
                  { name: "slurs", value: "slurs" },
                  { name: "everything", value: "all" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("mentions")
            .setDescription("Block messages with too many mentions (0 = off)")
            .addIntegerOption((o) => o.setName("count").setDescription("Mention limit (1-50, 0 disables)").setRequired(true).setMinValue(0).setMaxValue(50))
            .addBooleanOption((o) => o.setName("adopt").setDescription("Take over an existing same-type rule (Discord allows only one)")),
        )
        .addSubcommand((s) =>
          s
            .setName("spam")
            .setDescription("Block rapidly repeated spam messages")
            .addStringOption((o) => o.setName("state").setDescription("on / off").setRequired(true).addChoices({ name: "on", value: "on" }, { name: "off", value: "off" }))
            .addBooleanOption((o) => o.setName("adopt").setDescription("Take over an existing same-type rule (Discord allows only one)")),
        )
        .addSubcommand((s) =>
          s
            .setName("alertchannel")
            .setDescription("Where Discord sends AutoMod alerts")
            .addChannelOption((o) => o.setName("channel").setDescription("Alert channel (omit to clear)")),
        )
        .addSubcommand((s) =>
          s
            .setName("timeoutminutes")
            .setDescription("Timeout length for the timeout action (0 = block only)")
            .addIntegerOption((o) => o.setName("minutes").setDescription("0-1440").setRequired(true).setMinValue(0).setMaxValue(1440)),
        )
        .addSubcommand((s) => s.setName("status").setDescription("Show the live rules from Discord"))
        .addSubcommandGroup((g) =>
          g
            .setName("words")
            .setDescription("Your own keyword list")
            .addSubcommand((s) =>
              s
                .setName("add")
                .setDescription("Add words (comma separated)")
                .addStringOption((o) => o.setName("words").setDescription("word1, word2, ...").setRequired(true).setMaxLength(900)),
            )
            .addSubcommand((s) =>
              s
                .setName("remove")
                .setDescription("Remove words (comma separated)")
                .addStringOption((o) => o.setName("words").setDescription("word1, word2, ...").setRequired(true).setMaxLength(900)),
            )
            .addSubcommand((s) => s.setName("list").setDescription("List the current words")),
        ),
      async execute(interaction) {
        const i = await ensureGuild(interaction);
        if (!(await requirePermissions(i, PermissionFlagsBits.ManageGuild))) return;
        const cfg = await loadConfig(i.guild.id);
        const group = i.options.getSubcommandGroup(false);
        const sub = i.options.getSubcommand();

        const save = () => services.setModuleConfig(i.guild.id, "automod", cfg);

        if (group === "words") {
          const list = cfg.keywordFilter ?? [];
          if (sub === "list") {
            await i.reply({
              embeds: [
                embed({
                  color: COLORS.brand,
                  title: `🔤 AutoMod words (${list.length})`,
                  description: list.length > 0 ? list.slice(0, 60).map((w) => `\`${w}\``).join(" ") : "*none yet — add with `/automod words add`*",
                }),
              ],
              flags: 64,
            });
            return;
          }
          const raw = i.options.getString("words", true);
          const items = raw.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
          if (items.length === 0) throw new UserError("Give me at least one word.");
          if (sub === "add" && list.length + items.length > 500) throw new UserError("500 words max — split it up.");
          const next = sub === "add" ? [...new Set([...list, ...items])] : list.filter((w) => !items.includes(w));
          cfg.keywordFilter = next;
          await i.deferReply();
          try {
            if (next.length > 0) {
              await upsertRule(i.guild, RULE_KEYWORDS, { triggerType: AutoModerationRuleTriggerType.Keyword, triggerMetadata: { keywordFilter: next } }, cfg, true);
            } else {
              await removeRule(i.guild, RULE_KEYWORDS);
            }
          } catch (e) {
            await i.editReply(`⚠️ ${explainApiError(e)}`);
            return;
          }
          await save();
          await i.editReply(`✅ Word list is now **${next.length}** entries${sub === "add" ? ` (+${items.length})` : ` (-${items.length})`} — rule updated.`);
          return;
        }

        if (sub === "enable" || sub === "disable") {
          const presetOpt = i.options.getString("preset", true) as PresetKey | "all";
          const action = (i.options.getString("action") ?? "block") as "block" | "timeout";
          if (action === "timeout" && !(cfg.timeoutMinutes && cfg.timeoutMinutes > 0)) cfg.timeoutMinutes = 60;
          if (action === "block") cfg.timeoutMinutes = 0;

          const enable = sub === "enable";
          cfg.presets = { ...cfg.presets };
          if (presetOpt === "all") {
            cfg.presets = enable ? { profanity: true, sexual: true, slurs: true } : {};
          } else {
            cfg.presets[presetOpt] = enable;
          }

          const adopt = i.options.getBoolean("adopt") ?? false;
          await i.deferReply();
          let adopted: string | undefined;
          try {
            ({ adopted } = await syncPresets(i.guild, cfg, adopt));
          } catch (e) {
            if (isCapError(e) && !adopt) {
              const occ = await occupantName(i.guild, AutoModerationRuleTriggerType.KeywordPreset).catch(() => null);
              await i.editReply(
                `⚠️ Discord allows only **one** preset rule per server and it's taken by ${occ ? `**${occ}**` : "another rule"} — re-run with \`adopt:true\` and I'll take it over, or remove it in Server Settings → AutoMod.`,
              );
              return;
            }
            await i.editReply(`⚠️ ${explainApiError(e)}`);
            return;
          }
          await save();
          const active = (Object.keys(PRESET_VALUES) as PresetKey[]).filter((k) => cfg.presets?.[k]);
          await i.editReply(
            active.length > 0
              ? `✅ AutoMod presets **on**: ${active.join(", ")} (${action === "timeout" ? `block + ${cfg.timeoutMinutes} min timeout` : "block"})${cfg.alertChannelId ? ` · alerts → <#${cfg.alertChannelId}>` : ""}${adopted ? ` \n♻️ Took over the existing **${adopted}** rule.` : ""}.`
              : "⭕ All preset filtering off — the preset rule was removed.",
          );
          return;
        }

        if (sub === "mentions") {
          const count = i.options.getInteger("count", true);
          const adopt = i.options.getBoolean("adopt") ?? false;
          cfg.mentionLimit = count;
          await i.deferReply();
          let adopted: string | undefined;
          try {
            if (count > 0) {
              if (adopt) {
                ({ adopted } = await upsertWithAdopt(i.guild, RULE_MENTIONS, AutoModerationRuleTriggerType.MentionSpam, { mentionTotalLimit: count }, cfg));
              } else {
                await upsertRule(i.guild, RULE_MENTIONS, { triggerType: AutoModerationRuleTriggerType.MentionSpam, triggerMetadata: { mentionTotalLimit: count } }, cfg, true);
              }
            } else {
              await removeRule(i.guild, RULE_MENTIONS);
            }
          } catch (e) {
            if (isCapError(e) && !adopt) {
              const occ = await occupantName(i.guild, AutoModerationRuleTriggerType.MentionSpam).catch(() => null);
              await i.editReply(
                `⚠️ Discord allows only **one** mention-spam rule and it's taken by ${occ ? `**${occ}**` : "another rule"} — re-run with \`adopt:true\` and I'll take it over.`,
              );
              return;
            }
            await i.editReply(`⚠️ ${explainApiError(e)}`);
            return;
          }
          await save();
          await i.editReply(count > 0 ? `✅ Mention spam rule on — messages with **${count}+** mentions get blocked.${adopted ? ` ♻️ Took over **${adopted}**.` : ""}` : "⭕ Mention spam rule removed.");
          return;
        }

        if (sub === "spam") {
          const on = i.options.getString("state", true) === "on";
          const adopt = i.options.getBoolean("adopt") ?? false;
          cfg.spamEnabled = on;
          await i.deferReply();
          let adopted: string | undefined;
          try {
            if (on) {
              if (adopt) {
                ({ adopted } = await upsertWithAdopt(i.guild, RULE_SPAM, AutoModerationRuleTriggerType.Spam, undefined, cfg));
              } else {
                await upsertRule(i.guild, RULE_SPAM, { triggerType: AutoModerationRuleTriggerType.Spam }, cfg, true);
              }
            } else {
              await removeRule(i.guild, RULE_SPAM);
            }
          } catch (e) {
            if (isCapError(e) && !adopt) {
              const occ = await occupantName(i.guild, AutoModerationRuleTriggerType.Spam).catch(() => null);
              await i.editReply(
                `⚠️ Discord allows only **one** spam rule and it's taken by ${occ ? `**${occ}**` : "another rule"} — re-run with \`adopt:true\` and I'll take it over.`,
              );
              return;
            }
            await i.editReply(`⚠️ ${explainApiError(e)}`);
            return;
          }
          await save();
          await i.editReply(on ? `✅ Spam rule on — repeated message floods get blocked.${adopted ? ` ♻️ Took over **${adopted}**.` : ""}` : "⭕ Spam rule removed.");
          return;
        }

        if (sub === "alertchannel") {
          const channel = i.options.getChannel("channel");
          if (channel && !channel.isSendable()) throw new UserError("That channel cannot receive alerts.");
          cfg.alertChannelId = channel?.id ?? null;
          await i.deferReply();
          try {
            await resyncAll(i.guild, cfg);
          } catch (e) {
            await i.editReply(`⚠️ ${explainApiError(e)}`);
            return;
          }
          await save();
          await i.editReply(channel ? `🔔 AutoMod alerts will go to <#${channel.id}> (rules updated).` : "AutoMod alerts disabled (rules updated).");
          return;
        }

        if (sub === "timeoutminutes") {
          const minutes = i.options.getInteger("minutes", true);
          cfg.timeoutMinutes = minutes;
          if (minutes > 0 && !(cfg.presets && Object.values(cfg.presets).some(Boolean)) && !cfg.spamEnabled && !(cfg.mentionLimit ?? 0)) {
            // no rules to apply to — still save, harmless
          }
          await i.deferReply();
          try {
            await resyncAll(i.guild, cfg);
          } catch (e) {
            await i.editReply(`⚠️ ${explainApiError(e)}`);
            return;
          }
          await save();
          await i.editReply(minutes > 0 ? `✅ Timeout action set — blocked messages now time the author out for **${minutes} min**.` : "⭕ Timeout action off — rules only block messages now.");
          return;
        }

        // status
        let rules: AutoModerationRule[] = [];
        try {
          rules = await fetchRules(i.guild);
        } catch {
          throw new UserError("Could not fetch rules from Discord — check my Manage Server permission.");
        }
        const memRules = rules.filter((r) => r.name.startsWith(RULE_PREFIX));
        const otherCount = rules.length - memRules.length;
        const lines =
          memRules.length > 0
            ? memRules
                .map((r) => {
                  const kinds = r.actions
                    .map((a) =>
                      a.type === AutoModerationActionType.BlockMessage
                        ? "block"
                        : a.type === AutoModerationActionType.Timeout
                          ? "timeout"
                          : "alert",
                    )
                    .join("+");
                  return `${r.enabled ? "🟢" : "⚪"} **${r.name.replace(RULE_PREFIX, "")}** — ${TRIGGER_LABELS[r.triggerType] ?? "rule"} · ${kinds}`;
                })
                .join("\n")
            : "*no Mem rules yet — try `/automod enable preset:all`*";
        await i.reply({
          embeds: [
            embed({ color: COLORS.brand, title: "🤖 AutoMod status", description: lines }).setFooter({
              text: `${otherCount} other rule(s) not managed by Mem · words: ${(cfg.keywordFilter ?? []).length} · mention limit: ${cfg.mentionLimit ?? 0}`,
            }),
          ],
          flags: 64,
        });
      },
    },
  ],
});
