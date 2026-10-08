/**
 * Leveling math — single source of truth for the bot, dashboard and scripts.
 * Curve: advancing from level L to L+1 costs `5L^2 + 50L + 100` XP.
 */

/** XP needed to advance from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  const l = Math.max(0, Math.floor(level));
  return 5 * l * l + 50 * l + 100;
}

export interface LevelProgress {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP required to complete the current level. */
  need: number;
  /** into / need, clamped to [0, 1]. */
  ratio: number;
}

/** Splits total XP into level + in-level progress. */
export function progressFromXp(xp: number): LevelProgress {
  let level = 0;
  let remaining = Math.max(0, Math.floor(xp));
  for (let cost = xpToNext(0); remaining >= cost; cost = xpToNext(level)) {
    remaining -= cost;
    level += 1;
  }
  const need = xpToNext(level);
  return { level, into: remaining, need, ratio: Math.min(1, remaining / need) };
}

/** Highest level whose full cost is covered by `xp`. */
export function levelFromXp(xp: number): number {
  return progressFromXp(xp).level;
}

/** Total XP required to reach `level` from zero. */
export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let i = 0; i < Math.max(0, Math.floor(level)); i++) sum += xpToNext(i);
  return sum;
}
