import {
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
  type InteractionReplyOptions,
  type PermissionResolvable,
} from "discord.js";

export const ephemeral = (content: string): InteractionReplyOptions => ({
  content,
  flags: MessageFlags.Ephemeral,
});

/** Thrown for user-facing command errors; the global handler replies with the message. */
export class UserError extends Error {}

/** Narrows to a cached-guild interaction or throws a UserError. */
export async function ensureGuild(
  interaction: ChatInputCommandInteraction,
): Promise<ChatInputCommandInteraction<"cached">> {
  if (interaction.inCachedGuild()) return interaction;
  throw new UserError("This command only works inside a server.");
}

/** Replies with an error and returns false when the caller lacks permissions. */
export async function requirePermissions(
  interaction: ChatInputCommandInteraction,
  ...perms: PermissionResolvable[]
): Promise<boolean> {
  const memberPerms = interaction.memberPermissions;
  const ok = !!memberPerms && perms.every((perm) => memberPerms.has(perm));
  if (!ok) {
    await interaction.reply(ephemeral("You do not have the permissions required for this command.")).catch(() => undefined);
  }
  return ok;
}


/**
 * Security guard for moderation actions: blocks self-targeting, the bot itself,
 * the server owner, and members sitting at/above the bot's or the invoker's top role.
 */
export function guardTarget(i: ChatInputCommandInteraction<"cached">, target: GuildMember): void {
  if (target.id === i.user.id) throw new UserError("You can't target yourself with that action.");
  if (target.id === i.client.user.id) throw new UserError("I can't target myself. Pick someone else. 🤖");
  if (target.id === i.guild.ownerId) throw new UserError("The server owner is protected — I won't touch them.");
  const me = i.guild.members.me;
  if (me && target.roles.highest.position >= me.roles.highest.position) {
    throw new UserError("That member's top role is at or above mine — I can't act on them.");
  }
  if (i.user.id !== i.guild.ownerId && !i.member.permissions.has(PermissionFlagsBits.Administrator)) {
    if (target.roles.highest.position >= i.member.roles.highest.position) {
      throw new UserError("That member's top role is at or above yours — you can't act on them.");
    }
  }
}
