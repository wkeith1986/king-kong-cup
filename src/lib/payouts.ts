/**
 * Prize-money split logic for the King Kong Cup.
 *
 * Tie rule (from drbill): when N players tie at position K, they split the
 * SUM of prizes for positions K through K+N-1 evenly, and the next-best
 * finisher takes position K+N. Bonus-award ties split the same way.
 */

/** King Kong Cup prize ladder, in finishing-position order. */
export const KKC_PRIZES = [2500, 1000, 500] as const;

/** Bonus side-action prizes. */
export const BONUS_PRIZES = {
  lowGross: 200,
  lowNet: 200,
  netBirdies: 100,
} as const;

export const SKINS_BASE_POT_PER_ROUND = 300;

/**
 * Given a sorted-best-first list of players keyed by some score, group runs
 * of identical scores into shared positions and return per-player prize info.
 *
 * `scoreOf(player)` should return null for players who don't qualify (e.g.
 * no Best-4-Net yet). Unqualified players land at the end with no position
 * and zero prize.
 *
 * Splits prize money following the tie rule above.
 */
export function assignPrizes<T>(
  players: T[],
  scoreOf: (p: T) => number | null,
  prizes: readonly number[],
): Array<{
  player: T;
  position: number | null;
  isTied: boolean;
  prize: number;
}> {
  // Stable sort: qualified players by score ascending; unqualified to the end.
  const ranked = [...players].sort((a, b) => {
    const av = scoreOf(a);
    const bv = scoreOf(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv;
  });

  type Group = { players: T[]; score: number | null; startPos: number };
  const groups: Group[] = [];
  let nextPos = 1;
  for (const p of ranked) {
    const s = scoreOf(p);
    const last = groups[groups.length - 1];
    if (last && last.score === s) {
      last.players.push(p);
    } else {
      groups.push({ players: [p], score: s, startPos: nextPos });
    }
    nextPos += 1;
  }

  const out: Array<{
    player: T;
    position: number | null;
    isTied: boolean;
    prize: number;
  }> = [];

  for (const g of groups) {
    const qualified = g.score != null;
    const n = g.players.length;
    let prizeShare = 0;
    if (qualified) {
      // Sum the prize positions this group occupies: positions startPos..startPos+n-1.
      // Positions outside the prize ladder contribute $0.
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const posIndex = g.startPos - 1 + i; // 0-based prize index
        if (posIndex < prizes.length) sum += prizes[posIndex];
      }
      prizeShare = n > 0 ? sum / n : 0;
    }
    for (const p of g.players) {
      out.push({
        player: p,
        position: qualified ? g.startPos : null,
        isTied: qualified && n > 1,
        prize: prizeShare,
      });
    }
  }

  return out;
}

/**
 * Scale a prize ladder by a multiplier. Used to add the rolled-in skins
 * carryout to the KKC pot proportionally.
 *
 *   scalePrizes([2500, 1000, 500], 4200 / 4000) = [2625, 1050, 525]
 */
export function scalePrizes(
  prizes: readonly number[],
  factor: number,
): number[] {
  return prizes.map((p) => Math.round(p * factor * 100) / 100);
}

/** Sum a prize ladder. */
export function totalPrizes(prizes: readonly number[]): number {
  return prizes.reduce((s, p) => s + p, 0);
}
