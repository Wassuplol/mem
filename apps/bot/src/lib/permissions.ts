import {
  MessageFlags,
  type ChatInputCommandInteraction,
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
