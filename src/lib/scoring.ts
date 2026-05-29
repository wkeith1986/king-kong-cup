import type {
  HoleScore,
  LeaderboardRow,
  Player,
  Round,
  Score,
  Tee,
} from "./types";

/** Course Handicap = Index × (Slope / 113), rounded to nearest integer. */
export function courseHandicap(index: number, slope: number): number {
  return Math.round(index * (slope / 113));
}

/**
 * How many handicap strokes a player gets on a hole given their course handicap
 * and the hole's stroke index (1 = hardest, 18 = easiest).
 *
 *   CH ≤ 0     → 0 strokes anywhere (and -CH plus-strokes are NOT modeled here)
 *   CH 1..18   → 1 stroke on holes with SI ≤ CH; 0 elsewhere
 *   CH 19..36  → 1 stroke on every hole, plus a 2nd on holes with SI ≤ CH−18
 *   CH 37+     → keep wrapping
 */
export function strokesReceived(
  courseHandicap: number,
  strokeIndex: number,
): number {
  if (!Number.isFinite(courseHandicap) || courseHandicap <= 0) return 0;
  if (
    !Number.isInteger(strokeIndex) ||
    strokeIndex < 1 ||
    strokeIndex > 18
  ) {
    return 0;
  }
  const base = Math.floor(courseHandicap / 18);
  const extra = courseHandicap % 18 >= strokeIndex ? 1 : 0;
  return base + extra;
}

/** Net-to-par on a single hole. (gross − par − strokes received). */
export function holeNetToPar(
  gross: number,
  par: number,
  strokes: number,
): number {
  return gross - par - strokes;
}

/**
 * WHS net-double-bogey cap. A hole's gross score can't count for more than
 * (par + 2 + strokes received) for scoring/differential purposes. Equivalent
 * net-to-par cap is +2.
 *
 * The cap is applied silently — the actual gross is still what the player
 * shot. These helpers just give you the "for-scoring" value.
 */
export function adjustedGross(
  gross: number,
  par: number,
  strokes: number,
): number {
  return Math.min(gross, par + 2 + strokes);
}

export function adjustedNetToPar(
  gross: number,
  par: number,
  strokes: number,
): number {
  return Math.min(holeNetToPar(gross, par, strokes), 2);
}

/** Net Score = Gross − Course Handicap. */
export function netScore(gross: number, ch: number): number {
  return gross - ch;
}

/** Differential = (Gross − Course Rating) × 113 / Slope. */
export function differential(
  gross: number,
  rating: number,
  slope: number,
): number {
  return ((gross - rating) * 113) / slope;
}

/**
 * Compute the leaderboard.
 *
 * Best 4 of (up to) 5 net scores. If a player has fewer than 5 scores,
 * the missing rounds are automatic drops — sum whatever is available
 * (capped at the best 4).
 *
 * Position 1 = lowest Best-4-Net.
 *
 * Movement is the change in position vs. the leaderboard computed against
 * scores from previous rounds only.
 */
export function computeLeaderboard(
  players: Player[],
  rounds: Round[],
  scores: Score[],
  previousScores?: Score[],
): LeaderboardRow[] {
  const sortedRounds = [...rounds].sort(
    (a, b) => a.round_number - b.round_number,
  );

  const buildRow = (player: Player, scoreSet: Score[]) => {
    const perRound = sortedRounds.map((round) => {
      const s = scoreSet.find(
        (x) => x.round_id === round.id && x.player_id === player.id,
      );
      const isDNP = !!s && s.did_not_play;
      const played = !!s && !isDNP && s.gross != null && s.net != null;
      return {
        round_number: round.round_number,
        gross: played ? (s!.gross as number) : null,
        net: played ? (s!.net as number) : null,
        course_handicap: s?.course_handicap ?? null,
        // DNP rounds are pre-marked as drops; further drop-marking below.
        isDrop: isDNP,
        isDNP,
        played,
      };
    });

    const playedRounds = perRound.filter((r) => r.played);
    let bestFourNet: number | null = null;
    if (playedRounds.length > 0) {
      const sortedByNet = [...playedRounds].sort(
        (a, b) => (a.net as number) - (b.net as number),
      );
      const counted = sortedByNet.slice(
        0,
        Math.min(4, sortedByNet.length),
      );
      bestFourNet = counted.reduce(
        (sum, r) => sum + (r.net as number),
        0,
      );

      // Mark the worst-net round as the drop only when the player played all
      // 5. With fewer than 5 played, the missing/DNP rounds ARE the drops; no
      // extra marking needed.
      if (playedRounds.length === 5) {
        const dropped = sortedByNet[4];
        const dropEntry = perRound.find(
          (r) => r.round_number === dropped.round_number,
        );
        if (dropEntry) dropEntry.isDrop = true;
      }
    }

    const totalNet = playedRounds.length
      ? playedRounds.reduce((s, r) => s + (r.net as number), 0)
      : null;

    // Projection = the player's likely *final* Best 4 if their current pace
    // (avg net) holds for the rounds they have left. We take their actual
    // played nets, add the rounds they still have at that average, then apply
    // the same Best-4-of-up-to-5 drop.
    //
    // Two important properties:
    //   - When a player is finished (no rounds remaining), this equals their
    //     real Best 4 exactly — so ranking by projection doesn't distort the
    //     final standings.
    //   - Mid-trip it normalizes for rounds played, so a player who has simply
    //     played fewer rounds can't post a falsely-low running total and leap
    //     to the top. The standings are sorted by this number; the running
    //     Best-4 total is still shown in its own column.
    const dnpRounds = perRound.filter((r) => r.isDNP).length;
    const maxRounds = Math.max(0, sortedRounds.length - dnpRounds);
    const avgNet =
      playedRounds.length > 0 ? totalNet! / playedRounds.length : null;
    const remainingRounds = Math.max(0, maxRounds - playedRounds.length);
    let projectedBestFour: number | null = null;
    if (avgNet != null && maxRounds > 0) {
      const projectedNets = playedRounds.map((r) => r.net as number);
      for (let i = 0; i < remainingRounds; i++) projectedNets.push(avgNet);
      projectedNets.sort((a, b) => a - b);
      projectedBestFour = Math.round(
        projectedNets
          .slice(0, Math.min(4, projectedNets.length))
          .reduce((sum, v) => sum + v, 0),
      );
    }

    return {
      player,
      perRound,
      totalNet,
      bestFourNet,
      roundsPlayed: playedRounds.length,
      dnpRounds,
      maxRounds,
      avgNet: avgNet != null ? Math.round(avgNet * 10) / 10 : null,
      projectedBestFour,
    };
  };

  const current = players.map((p) => buildRow(p, scores));

  // Rank by projected final Best 4 (pace) ascending; nulls (no rounds yet)
  // sink to the bottom. Ranking by projection rather than the raw running
  // Best-4 total keeps a player who has played fewer rounds from showing a
  // falsely-low total and leaping to the top. Once everyone is finished the
  // projection equals the real Best 4, so the final order is correct.
  current.sort((a, b) => {
    if (a.projectedBestFour == null && b.projectedBestFour == null) return 0;
    if (a.projectedBestFour == null) return 1;
    if (b.projectedBestFour == null) return -1;
    return a.projectedBestFour - b.projectedBestFour;
  });

  // Assign positions with tie-sharing: players with the same projected Best 4
  // share the same position number; the next finisher skips ahead by the
  // size of the tie group. (Standard golf tie ranking.)
  const withPosition: LeaderboardRow[] = [];
  let i = 0;
  while (i < current.length) {
    let j = i;
    const score = current[i].projectedBestFour;
    while (
      j < current.length &&
      current[j].projectedBestFour === score &&
      score != null
    ) {
      j += 1;
    }
    // If score is null (unqualified), each row is its own "position" but
    // visually we show "—"; we still assign a position number for stability.
    const groupSize = score == null ? 1 : j - i;
    const sharedPos = i + 1;
    const isTied = groupSize > 1;
    const upper = score == null ? i + 1 : j;
    for (let k = i; k < upper; k++) {
      withPosition.push({
        ...current[k],
        position: sharedPos,
        isTied,
        movement: 0,
      });
    }
    i = upper;
  }

  // Movement = previous_position − current_position (positive means moved up).
  if (previousScores && previousScores.length) {
    const prev = players.map((p) => buildRow(p, previousScores));
    prev.sort((a, b) => {
      if (a.projectedBestFour == null && b.projectedBestFour == null) return 0;
      if (a.projectedBestFour == null) return 1;
      if (b.projectedBestFour == null) return -1;
      return a.projectedBestFour - b.projectedBestFour;
    });
    // Tie-sharing for previous positions too, so swapping within a tied
    // group doesn't show false movement.
    const prevPositionByPlayer = new Map<string, number>();
    let pi = 0;
    while (pi < prev.length) {
      let pj = pi;
      const score = prev[pi].projectedBestFour;
      while (
        pj < prev.length &&
        prev[pj].projectedBestFour === score &&
        score != null
      ) {
        pj += 1;
      }
      const upper = score == null ? pi + 1 : pj;
      for (let pk = pi; pk < upper; pk++) {
        prevPositionByPlayer.set(prev[pk].player.id, pi + 1);
      }
      pi = upper;
    }
    for (const row of withPosition) {
      const prevPos = prevPositionByPlayer.get(row.player.id);
      if (prevPos != null) row.movement = prevPos - row.position;
    }
  }

  return withPosition;
}

/**
 * Given a player's already-played net scores and the number of rounds they
 * have left, return the highest *constant net-per-remaining-round* that still
 * lands their final Best-4-Net at or below `target`.
 *
 * This mirrors the Best-4-of-up-to-5 drop used everywhere else: with 5 total
 * rounds the single worst net is dropped; with 4 or fewer every round counts.
 *
 * Return values:
 *   - `null`                         → no rounds remaining (nothing to compute)
 *   - `Number.POSITIVE_INFINITY`     → already locked at/under target no matter
 *                                      how badly the remaining rounds go
 *   - `Number.NEGATIVE_INFINITY`     → unreachable even with a flawless finish
 *   - finite number                  → the net average they must hold (or beat)
 *
 * The search is monotonic: lower net-per-round can only lower the Best-4-Net,
 * so a simple bisection finds the breakpoint.
 */
export function requiredNetPerRound(
  playedNets: number[],
  remaining: number,
  target: number,
): number | null {
  if (remaining <= 0) return null;

  const bestFourWith = (x: number): number => {
    const all = [...playedNets];
    for (let i = 0; i < remaining; i++) all.push(x);
    all.sort((a, b) => a - b);
    return all
      .slice(0, Math.min(4, all.length))
      .reduce((sum, v) => sum + v, 0);
  };

  const LOW = -50; // a flawless, unrealistically good net
  const HIGH = 130; // a blow-up round

  // Even a disaster still keeps them at/under target → they can't fall out.
  if (bestFourWith(HIGH) <= target) return Number.POSITIVE_INFINITY;
  // Even a perfect finish can't get them there → mathematically out.
  if (bestFourWith(LOW) > target) return Number.NEGATIVE_INFINITY;

  let lo = LOW;
  let hi = HIGH;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if (bestFourWith(mid) <= target) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * For a single round, compute every player's gross / course handicap /
 * net / differential given the tee and current indexes.
 */
export function buildScoreRow(opts: {
  index: number;
  gross: number;
  tee: Pick<Tee, "rating" | "slope">;
}) {
  const ch = courseHandicap(opts.index, opts.tee.slope);
  const net = netScore(opts.gross, ch);
  const diff = differential(opts.gross, opts.tee.rating, opts.tee.slope);
  return {
    course_handicap: ch,
    net,
    differential: Math.round(diff * 100) / 100,
  };
}

/** Group hole-scores by hole_number for skins computation. */
export function groupHoleScoresByHole(
  hs: HoleScore[],
): Map<number, HoleScore[]> {
  const m = new Map<number, HoleScore[]>();
  for (const h of hs) {
    const list = m.get(h.hole_number) ?? [];
    list.push(h);
    m.set(h.hole_number, list);
  }
  return m;
}
