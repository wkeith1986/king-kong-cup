import type { Hole, HoleScore, Player, Score, Skin } from "@/lib/types";
import { adjustedGross, strokesReceived } from "@/lib/scoring";
import { signedNetToPar } from "@/lib/format";

/**
 * Per-round scorecard table. One row per player, 18 hole columns, with
 * out/in/total subtotals. Renders gross strokes per hole with handicap-pop
 * dots and highlights cells where a player won the skin.
 */
export function RoundScorecard({
  players,
  scores,
  holes,
  holeScores,
  skins,
  skinValue,
}: {
  players: Player[];
  scores: Score[];
  holes: Hole[];
  holeScores: HoleScore[];
  skins: Skin[];
  skinValue: number;
}) {
  if (holes.length === 0 || holeScores.length === 0) return null;

  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number);
  const front = sortedHoles.filter((h) => h.hole_number <= 9);
  const back = sortedHoles.filter((h) => h.hole_number >= 10);
  const outPar = front.reduce((s, h) => s + h.par, 0);
  const inPar = back.reduce((s, h) => s + h.par, 0);

  // Map skin winners by hole for fast lookup
  const skinByHole = new Map<number, Skin>(
    skins.map((s) => [s.hole_number, s]),
  );

  // For each player, their hole-by-hole gross + net-to-par
  const byPlayer = new Map<
    string,
    Map<number, { gross: number | null; netToPar: number }>
  >();
  for (const hs of holeScores) {
    if (!byPlayer.has(hs.player_id)) byPlayer.set(hs.player_id, new Map());
    byPlayer.get(hs.player_id)!.set(hs.hole_number, {
      gross: hs.gross,
      netToPar: hs.net_to_par,
    });
  }

  // Sort players: those with hole scores first (by their net), then others.
  const scoreByPlayer = new Map(scores.map((s) => [s.player_id, s]));
  const orderedPlayers = [...players]
    .filter((p) => byPlayer.has(p.id))
    .sort((a, b) => {
      const an = scoreByPlayer.get(a.id)?.net ?? Number.POSITIVE_INFINITY;
      const bn = scoreByPlayer.get(b.id)?.net ?? Number.POSITIVE_INFINITY;
      return an - bn;
    });

  const renderHoleCell = (
    playerId: string,
    h: Hole,
    ch: number,
  ) => {
    const entry = byPlayer.get(playerId)?.get(h.hole_number);
    const skin = skinByHole.get(h.hole_number);
    const wonSkin = skin?.winner_player_id === playerId;
    const pops = strokesReceived(ch, h.stroke_index);
    if (!entry || entry.gross == null) {
      return (
        <td
          key={h.hole_number}
          className="px-1 py-1 text-center text-brand-cream/25 border border-brand-gold/10"
        >
          —
        </td>
      );
    }
    const isBirdieOrBetter = entry.gross - h.par <= -1;
    const adj = adjustedGross(entry.gross, h.par, pops);
    const capped = adj < entry.gross;
    return (
      <td
        key={h.hole_number}
        title={
          capped
            ? `Shot ${entry.gross}; counts as ${adj} (net double bogey cap)`
            : undefined
        }
        className={
          "px-1 py-1 text-center border border-brand-gold/10 relative tabular-nums " +
          (wonSkin
            ? "bg-brand-gold/30 ring-1 ring-brand-gold"
            : entry.netToPar < 0
              ? "bg-emerald-500/10"
              : entry.netToPar === 0
                ? ""
                : entry.netToPar >= 2
                  ? "text-brand-cream/60"
                  : "")
        }
      >
        <div className={isBirdieOrBetter ? "font-bold" : ""}>
          {entry.gross}
          {capped && (
            <span className="text-[8px] text-brand-gold align-top ml-0.5">
              ✱
            </span>
          )}
        </div>
        {pops > 0 && (
          <div className="text-[8px] text-brand-gold leading-none">
            {"●".repeat(Math.min(pops, 3))}
          </div>
        )}
      </td>
    );
  };

  // Adjusted (capped) sum — what the leaderboard uses. Hole-level display
  // still shows raw gross, so totals can legitimately differ when a player
  // had a blow-up hole.
  const sumGross = (playerId: string, holeSet: Hole[], ch: number) => {
    let total = 0;
    let any = false;
    for (const h of holeSet) {
      const entry = byPlayer.get(playerId)?.get(h.hole_number);
      if (entry?.gross != null) {
        const pops = strokesReceived(ch, h.stroke_index);
        total += adjustedGross(entry.gross, h.par, pops);
        any = true;
      }
    }
    return any ? total : null;
  };

  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-widest text-brand-gold/80 mb-2">
        Scorecard
      </div>
      <div className="overflow-x-auto scroll-x-touch -mx-5 px-5 sm:mx-0 sm:px-0">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr className="text-brand-gold/85">
              <th className="sticky left-0 z-10 bg-brand-warm px-2 py-1 text-left border border-brand-gold/30">
                Hole
              </th>
              {front.map((h) => (
                <th
                  key={h.hole_number}
                  className="px-1 py-1 text-center border border-brand-gold/30"
                >
                  {h.hole_number}
                </th>
              ))}
              <th className="px-1 py-1 text-center border border-brand-gold/30 bg-brand-dark/40">
                Out
              </th>
              {back.map((h) => (
                <th
                  key={h.hole_number}
                  className="px-1 py-1 text-center border border-brand-gold/30"
                >
                  {h.hole_number}
                </th>
              ))}
              <th className="px-1 py-1 text-center border border-brand-gold/30 bg-brand-dark/40">
                In
              </th>
              <th className="px-1 py-1 text-center border border-brand-gold/30 bg-brand-dark/60">
                Tot
              </th>
              <th className="px-2 py-1 text-center border border-brand-gold/30 bg-brand-dark/60">
                Net
              </th>
              <th className="px-2 py-1 text-center border border-brand-gold/30 bg-brand-dark/60">
                Skins
              </th>
            </tr>
            <tr className="text-brand-cream/75">
              <th className="sticky left-0 z-10 bg-brand-warm px-2 py-1 text-left border border-brand-gold/20">
                Par
              </th>
              {front.map((h) => (
                <th
                  key={h.hole_number}
                  className="px-1 py-1 text-center border border-brand-gold/10 tabular-nums"
                >
                  {h.par}
                </th>
              ))}
              <th className="px-1 py-1 text-center border border-brand-gold/20 bg-brand-dark/30 tabular-nums">
                {outPar}
              </th>
              {back.map((h) => (
                <th
                  key={h.hole_number}
                  className="px-1 py-1 text-center border border-brand-gold/10 tabular-nums"
                >
                  {h.par}
                </th>
              ))}
              <th className="px-1 py-1 text-center border border-brand-gold/20 bg-brand-dark/30 tabular-nums">
                {inPar}
              </th>
              <th className="px-1 py-1 text-center border border-brand-gold/20 bg-brand-dark/40 tabular-nums">
                {outPar + inPar}
              </th>
              <th className="px-1 py-1 border border-brand-gold/20 bg-brand-dark/40" />
              <th className="px-1 py-1 border border-brand-gold/20 bg-brand-dark/40" />
            </tr>
            <tr className="text-brand-gold/60 text-[10px] uppercase tracking-wider">
              <th className="sticky left-0 z-10 bg-brand-warm px-2 py-1 text-left border border-brand-gold/20">
                SI
              </th>
              {front.map((h) => (
                <th
                  key={h.hole_number}
                  className="px-1 py-1 text-center border border-brand-gold/10 tabular-nums font-normal"
                >
                  {h.stroke_index}
                </th>
              ))}
              <th className="px-1 py-1 border border-brand-gold/20 bg-brand-dark/30" />
              {back.map((h) => (
                <th
                  key={h.hole_number}
                  className="px-1 py-1 text-center border border-brand-gold/10 tabular-nums font-normal"
                >
                  {h.stroke_index}
                </th>
              ))}
              <th className="px-1 py-1 border border-brand-gold/20 bg-brand-dark/30" />
              <th className="px-1 py-1 border border-brand-gold/20 bg-brand-dark/40" />
              <th className="px-1 py-1 border border-brand-gold/20 bg-brand-dark/40" />
              <th className="px-1 py-1 border border-brand-gold/20 bg-brand-dark/40" />
            </tr>
          </thead>
          <tbody>
            {orderedPlayers.map((p) => {
              const score = scoreByPlayer.get(p.id);
              const ch = score?.course_handicap ?? 0;
              const out = sumGross(p.id, front, ch);
              const inTotal = sumGross(p.id, back, ch);
              const tot =
                out != null && inTotal != null
                  ? out + inTotal
                  : (score?.gross ?? null);
              const skinsWon = skins.filter(
                (s) => s.winner_player_id === p.id,
              ).length;
              return (
                <tr key={p.id} className="text-brand-cream/90">
                  <td className="sticky left-0 z-10 bg-brand-warm px-2 py-1 border border-brand-gold/10 whitespace-nowrap">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[10px] text-brand-cream/50">
                      CH {ch}
                    </div>
                  </td>
                  {front.map((h) => renderHoleCell(p.id, h, ch))}
                  <td className="px-1 py-1 text-center border border-brand-gold/20 bg-brand-dark/30 tabular-nums font-semibold">
                    {out ?? "—"}
                  </td>
                  {back.map((h) => renderHoleCell(p.id, h, ch))}
                  <td className="px-1 py-1 text-center border border-brand-gold/20 bg-brand-dark/30 tabular-nums font-semibold">
                    {inTotal ?? "—"}
                  </td>
                  <td className="px-1 py-1 text-center border border-brand-gold/20 bg-brand-dark/40 tabular-nums font-bold">
                    {tot ?? "—"}
                  </td>
                  <td className="px-2 py-1 text-center border border-brand-gold/20 bg-brand-dark/40 tabular-nums">
                    {score?.net ?? "—"}
                  </td>
                  <td className="px-2 py-1 text-center border border-brand-gold/20 bg-brand-dark/40 tabular-nums">
                    {skinsWon > 0 ? (
                      <span className="text-brand-gold font-semibold">
                        {skinsWon}
                        {skinValue > 0 && (
                          <span className="text-[10px] text-brand-gold/70 ml-1">
                            ${Math.round(skinsWon * skinValue)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-brand-cream/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[10px] text-brand-cream/60 flex flex-wrap gap-x-4 gap-y-1">
        <span>
          <span className="inline-block align-middle w-2.5 h-2.5 rounded-sm bg-brand-gold/30 ring-1 ring-brand-gold mr-1" />
          skin won
        </span>
        <span>
          <span className="inline-block align-middle w-2.5 h-2.5 rounded-sm bg-emerald-500/10 mr-1" />
          net birdie or better
        </span>
        <span>
          <span className="text-brand-gold mr-1">●</span>
          handicap pop on hole
        </span>
        <span>
          <span className="text-brand-gold mr-1">✱</span>
          capped at net double bogey for scoring
        </span>
        <span className="text-brand-cream/50">{signedNetToPar(0)} = net par</span>
      </div>
    </div>
  );
}
