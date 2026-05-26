import type { HoleScore } from "./types";
import { groupHoleScoresByHole } from "./scoring";

export type ComputedSkin = {
  hole_number: number;
  winner_player_id: string;
  value: number;
};

export type SkinsResult = {
  skins: ComputedSkin[];
  totalSkins: number;
  pot: number;
  perSkinValue: number;
  carryOut: number;
};

/**
 * Compute skins for a single round.
 *
 * Rule: a player wins a skin on a hole iff they are the SOLE lowest net-to-par
 * AND their net-to-par is ≤ 0 (i.e. net par or better).
 *
 * pot = base ($300) + any prior carry-in.
 * If skins are won, pot is divided evenly; otherwise the entire pot carries out.
 */
export function computeSkins(
  holeScores: HoleScore[],
  basePot: number,
  carryIn: number,
): SkinsResult {
  const pot = basePot + carryIn;
  const byHole = groupHoleScoresByHole(holeScores);
  const winners: ComputedSkin[] = [];

  for (const [hole, entries] of byHole) {
    if (entries.length === 0) continue;
    const min = Math.min(...entries.map((e) => e.net_to_par));
    if (min > 0) continue; // must be net par or better
    const winnersAtMin = entries.filter((e) => e.net_to_par === min);
    if (winnersAtMin.length !== 1) continue; // must be sole low
    winners.push({
      hole_number: hole,
      winner_player_id: winnersAtMin[0].player_id,
      value: 0, // filled in after we know totalSkins
    });
  }

  const totalSkins = winners.length;
  if (totalSkins === 0) {
    return {
      skins: [],
      totalSkins: 0,
      pot,
      perSkinValue: 0,
      carryOut: pot,
    };
  }

  const perSkinValue = Math.round((pot / totalSkins) * 100) / 100;
  for (const w of winners) w.value = perSkinValue;

  return {
    skins: winners,
    totalSkins,
    pot,
    perSkinValue,
    carryOut: 0,
  };
}

/** Total skins earnings per player across all rounds. */
export function totalSkinsByPlayer(
  skins: Array<{ winner_player_id: string; value: number }>,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of skins) {
    m.set(
      s.winner_player_id,
      (m.get(s.winner_player_id) ?? 0) + Number(s.value),
    );
  }
  return m;
}
