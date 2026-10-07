/** Shared duration parsing used by reminders, tempbans, temp roles, giveaways. */
const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/** "1d2h30m" -> milliseconds; null when the whole string is not duration parts. */
export function parseDuration(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!text) return null;
  let total = 0;
  let consumed = 0;
  for (const match of text.matchAll(/(\d+)([smhdw])/g)) {
    consumed += match[0].length;
    total += Number(match[1]) * (UNIT_MS[match[2] ?? ""] ?? 0);
  }
  return consumed === text.length && total > 0 ? total : null;
}

/** Compact human text: 90_000 -> "1m 30s", 7_200_000 -> "2h". */
export function formatDuration(ms: number): string {
  const parts: string[] = [];
  let rest = Math.floor(ms / 1_000);
  const units: Array<[string, number]> = [
    ["w", 604_800],
    ["d", 86_400],
    ["h", 3_600],
    ["m", 60],
    ["s", 1],
  ];
  for (const [label, size] of units) {
    const amount = Math.floor(rest / size);
    if (amount > 0) {
      parts.push(`${amount}${label}`);
      rest -= amount * size;
    }
  }
  return parts.slice(0, 2).join(" ") || "0s";
}
