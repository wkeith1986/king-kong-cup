import type { Course, Hole, Player, Tee } from "@/lib/types";
import { courseHandicap, strokesReceived } from "@/lib/scoring";
import { fmtDate, fmtIndex } from "@/lib/format";

/**
 * On-screen reference card for one player on one round.
 * Shows par + stroke index + which holes they get handicap pops on,
 * so they can mark up their physical scorecard at the tee.
 */
export function PrintableScorecard({
  player,
  course,
  tee,
  holes,
  playedOn,
  roundNumber,
}: {
  player: Player;
  course: Course | null;
  tee: Tee | null;
  holes: Hole[];
  playedOn: string | null;
  roundNumber: number;
}) {
  const ch = tee ? courseHandicap(Number(player.current_index), tee.slope) : 0;
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number);
  const front = sortedHoles.filter((h) => h.hole_number <= 9);
  const back = sortedHoles.filter((h) => h.hole_number >= 10);
  const outPar = front.reduce((s, h) => s + h.par, 0);
  const inPar = back.reduce((s, h) => s + h.par, 0);
  const popsFront = front.reduce(
    (s, h) => s + strokesReceived(ch, h.stroke_index),
    0,
  );
  const popsBack = back.reduce(
    (s, h) => s + strokesReceived(ch, h.stroke_index),
    0,
  );
  const popHoles = sortedHoles
    .filter((h) => strokesReceived(ch, h.stroke_index) > 0)
    .map((h) => h.hole_number);

  return (
    <div className="card p-4 sm:p-5 bg-brand-warm/20">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 pb-3 border-b border-brand-gold/30">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-brand-gold/80">
            Round {roundNumber} &middot; {fmtDate(playedOn)}
          </div>
          <div className="font-serif text-xl text-brand-cream font-bold leading-tight mt-0.5">
            {player.name}
          </div>
          <div className="text-xs text-brand-cream/70 mt-0.5">
            {course?.name ?? "TBD"}
            {tee && (
              <>
                {" "}
                &middot; {tee.name} (R {tee.rating} / S {tee.slope})
              </>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-widest text-brand-gold/80">
            Index / CH
          </div>
          <div className="font-bold tabular-nums text-lg leading-tight">
            {fmtIndex(player.current_index)}
            <span className="text-brand-gold mx-1">/</span>
            <span className="text-brand-gold">{ch}</span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-brand-cream/60 mt-0.5">
            {ch} pop{ch === 1 ? "" : "s"} total
          </div>
        </div>
      </div>

      {/* Pop holes at-a-glance */}
      {ch > 0 && popHoles.length > 0 && (
        <div className="mt-3 text-xs text-brand-cream/85">
          <span className="text-brand-gold/80 uppercase tracking-widest text-[10px] mr-2">
            Pop holes:
          </span>
          <span className="font-semibold tabular-nums">
            {popHoles.join(", ")}
          </span>
        </div>
      )}

      {/* Front nine */}
      <Nine
        title="Front"
        holes={front}
        ch={ch}
        par={outPar}
        pops={popsFront}
        endLabel="OUT"
      />

      {/* Back nine */}
      <Nine
        title="Back"
        holes={back}
        ch={ch}
        par={inPar}
        pops={popsBack}
        endLabel="IN"
      />
    </div>
  );
}

function Nine({
  title,
  holes,
  ch,
  par,
  pops,
  endLabel,
}: {
  title: string;
  holes: Hole[];
  ch: number;
  par: number;
  pops: number;
  endLabel: string;
}) {
  return (
    <div className="mt-3">
      <div className="text-[10px] uppercase tracking-widest text-brand-gold/70 mb-1">
        {title}
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-brand-gold/85">
            <th className="text-left px-1 py-1 border border-brand-gold/30">
              Hole
            </th>
            {holes.map((h) => (
              <th
                key={h.hole_number}
                className="px-1 py-1 text-center border border-brand-gold/30 tabular-nums"
              >
                {h.hole_number}
              </th>
            ))}
            <th className="px-1 py-1 text-center border border-brand-gold/30 bg-brand-dark/40">
              {endLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-brand-cream/80">
            <td className="text-left px-1 py-1 border border-brand-gold/20">
              Par
            </td>
            {holes.map((h) => (
              <td
                key={h.hole_number}
                className="px-1 py-1 text-center border border-brand-gold/20 tabular-nums"
              >
                {h.par}
              </td>
            ))}
            <td className="px-1 py-1 text-center border border-brand-gold/20 bg-brand-dark/30 tabular-nums">
              {par}
            </td>
          </tr>
          <tr className="text-brand-gold/65">
            <td className="text-left px-1 py-1 border border-brand-gold/20">
              SI
            </td>
            {holes.map((h) => (
              <td
                key={h.hole_number}
                className="px-1 py-1 text-center border border-brand-gold/20 tabular-nums"
              >
                {h.stroke_index}
              </td>
            ))}
            <td className="px-1 py-1 border border-brand-gold/20 bg-brand-dark/30" />
          </tr>
          <tr className="text-brand-gold">
            <td className="text-left px-1 py-1.5 border border-brand-gold/20 text-[10px] uppercase tracking-wider">
              Pops
            </td>
            {holes.map((h) => {
              const s = strokesReceived(ch, h.stroke_index);
              return (
                <td
                  key={h.hole_number}
                  className={
                    "px-1 py-1.5 text-center border border-brand-gold/20 tabular-nums " +
                    (s > 0 ? "bg-brand-gold/15" : "")
                  }
                >
                  {s > 0 ? (
                    <span>{"●".repeat(Math.min(s, 3))}</span>
                  ) : (
                    <span className="text-brand-cream/20">{"·"}</span>
                  )}
                </td>
              );
            })}
            <td className="px-1 py-1.5 text-center border border-brand-gold/20 bg-brand-dark/30 tabular-nums text-[11px]">
              {pops > 0 ? pops : ""}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
