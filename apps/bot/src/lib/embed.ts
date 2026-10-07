import { EmbedBuilder } from "discord.js";

export type { EmbedBuilder };

export const COLORS = {
  brand: 0x8b5cf6, // violet
  success: 0x34d399,
  warn: 0xfbbf24,
  error: 0xf87171,
  neutral: 0x71717a,
} as const;

export function embed(options: { color?: number; title?: string; description?: string } = {}): EmbedBuilder {
  const builder = new EmbedBuilder().setColor(options.color ?? COLORS.brand);
  if (options.title) builder.setTitle(options.title);
  if (options.description) builder.setDescription(options.description);
  return builder;
}
