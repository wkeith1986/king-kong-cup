import type { Score } from "./types";

/**
 * After each round, average all trip differentials for the player.
 * If the average is 5+ strokes better than the player's STARTING index,
 * the new trip index = starting − (avg shortfall − 5).
 *
 * Adjustments only ever go down (never raise the index). One hot round
 * won't trigger it because the average smooths it out.
 *
 * Returns null if no adjustment is warranted.
 */
export function computeHandicapAdjustment(opts: {
  startingIndex: number;
  currentIndex: number;
  differentials: number[];
}): { newIndex: number; avgDifferential: number; roundsCounted: number } | null {
  const ds = opts.differentials.filter((d) => Number.isFinite(d));
  if (ds.length === 0) return null;

  const avg = ds.reduce((s, d) => s + d, 0) / ds.length;
  const strokesBetter = opts.startingIndex - avg;

  if (strokesBetter < 5) return null;

  const excess = strokesBetter - 5;
  const proposed = Math.round((opts.startingIndex - excess) * 10) / 10;

  // Only adjust downward, and only if the proposed index is actually lower
  // than what the player currently sits at.
  if (proposed >= opts.currentIndex) return null;

  return {
    newIndex: proposed,
    avgDifferential: Math.round(avg * 100) / 100,
    roundsCounted: ds.length,
  };
}

/** Pull all differentials for a single player across the scores list. */
export function differentialsForPlayer(
  scores: Score[],
  playerId: string,
): number[] {
  return scores
    .filter((s) => s.player_id === playerId && s.differential != null)
    .map((s) => Number(s.differential));
}
