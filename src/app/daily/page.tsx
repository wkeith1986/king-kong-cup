import Link from "next/link";
import { RoundScorecard } from "@/components/RoundScorecard";
import { getAll } from "@/lib/data";
import { fmtDate, fmtIndex, money } from "@/lib/format";
import { totalSkinsByPlayer } from "@/lib/skins";

export const dynamic = "force-dynamic";

export default async function DailyPage({
  searchParams,
}: {
  searchParams?: { round?: string };
}) {
  const {
    players,
    courses,
    tees,
    holes,
    rounds,
    scores,
    holeScores,
    skins,
    skinPots,
    adjustments,
  } = await getAll();
  const playerById = new Map(players.map((p) => [p.id, p]));
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const teeById = new Map(tees.map((t) => [t.id, t]));
  const potByRound = new Map(skinPots.map((p) => [p.round_id, p]));

  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

  // Decide which round to show.
  //   1. ?round=N if valid
  //   2. else, the most recent "complete" round
  //   3. else, R1
  const requested = Number(searchParams?.round);
  const validRequested =
    Number.isInteger(requested) &&
    sortedRounds.some((r) => r.round_number === requested)
      ? requested
      : null;
  const lastComplete = [...sortedRounds]
    .reverse()
    .find((r) => r.status === "complete");
  const activeRoundNumber =
    validRequested ?? lastComplete?.round_number ?? sortedRounds[0]?.round_number ?? 1;
  const round = sortedRounds.find((r) => r.round_number === activeRoundNumber);

  return (
    <div className="container-narrow pt-8 pb-12">
      <header className="mb-5">
        <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold">
          Daily Results
        </h1>
        <p className="text-sm text-brand-cream/70 mt-1">
          Pick a round to see the leaderboard, skins, scorecard, and any
          handicap adjustments from that day.
        </p>
      </header>

      {/* Round picker */}
      <nav className="mb-5 flex flex-wrap gap-2">
        {sortedRounds.map((r) => {
          const active = r.round_number === activeRoundNumber;
          const isComplete = r.status === "complete";
          return (
            <Link
              key={r.id}
              href={`/daily?round=${r.round_number}`}
              scroll={false}
              className={
                "px-3 py-2 rounded-md text-sm border transition flex items-center gap-2 " +
                (active
                  ? "bg-brand-gold text-brand-dark border-brand-gold font-semibold"
                  : "border-brand-gold/30 text-brand-cream/85 hover:bg-brand-gold/10")
              }
            >
              <span className="uppercase tracking-wider text-xs">
                R{r.round_number}
              </span>
              <span
                className={
                  "w-1.5 h-1.5 rounded-full " +
                  (isComplete
                    ? active
                      ? "bg-brand-dark"
                      : "bg-emerald-400"
                    : active
                      ? "bg-brand-dark/40"
                      : "bg-brand-cream/30")
                }
              />
            </Link>
          );
        })}
      </nav>

      {!round ? (
        <div className="card p-8 text-center font-serif italic text-brand-cream/60">
          No rounds yet.
        </div>
      ) : (
        (() => {
          const course = courseById.get(round.course_id);
          const tee = round.tee_id ? teeById.get(round.tee_id) : undefined;
          const courseHoles = holes
            .filter((h) => h.course_id === round.course_id)
            .sort((a, b) => a.hole_number - b.hole_number);
          const roundScoresAll = scores.filter((s) => s.round_id === round.id);
          const playedScores = roundScoresAll
            .filter((s) => !s.did_not_play && s.net != null)
            .sort((a, b) => (a.net as number) - (b.net as number));
          const dnpScores = roundScoresAll.filter((s) => s.did_not_play);
          const winningNet = playedScores[0]?.net ?? null;
          const winners = playedScores.filter((s) => s.net === winningNet);
          const roundSkins = skins.filter((s) => s.round_id === round.id);
          const roundHoleScores = holeScores.filter((h) => h.round_id === round.id);
          const skinsByPlayer = totalSkinsByPlayer(roundSkins);
          const pot = potByRound.get(round.id);
          const totalPot = pot
            ? Number(pot.base_pot) + Number(pot.carry_in)
            : 300;
          const skinValue =
            roundSkins.length > 0 ? totalPot / roundSkins.length : 0;

          return (
            <section key={round.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <div>
                  <h2 className="h-display text-brand-gold text-base sm:text-lg">
                    Round {round.round_number}
                  </h2>
                  <div className="font-serif text-xl text-brand-cream mt-0.5">
                    {course?.name ?? "TBD"}
                  </div>
                  {course?.location && (
                    <div className="text-xs text-brand-cream/60">
                      {course.location}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-brand-cream/70">
                  <div className="text-brand-cream/85">{fmtDate(round.played_on)}</div>
                  {tee ? (
                    <div className="mt-0.5">
                      {tee.name} &middot; Rating {tee.rating} / Slope {tee.slope}
                    </div>
                  ) : (
                    <div className="mt-0.5 italic text-brand-cream/40">
                      Tees TBD
                    </div>
                  )}
                </div>
              </div>

              {round.status !== "complete" || playedScores.length === 0 ? (
                <div className="text-center py-8 font-serif italic text-brand-cream/50">
                  Awaiting results.
                </div>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-brand-gold/15 ring-1 ring-brand-gold/60 px-4 py-3 flex items-center justify-between sm:col-span-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-brand-gold">
                          {winners.length > 1
                            ? `Daily Winners (T${winners.length})`
                            : "Daily Winner"}
                        </div>
                        <div className="font-semibold">
                          {winners.length === 0
                            ? "—"
                            : winners
                                .map((s) => playerById.get(s.player_id)?.name)
                                .filter(Boolean)
                                .join(", ")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold tabular-nums">
                          {winningNet ?? "—"}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-brand-cream/60">
                          Net
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg bg-brand-dark/40 ring-1 ring-brand-gold/30 px-4 py-3">
                      <div className="text-[10px] uppercase tracking-widest text-brand-gold">
                        Skins Pot
                      </div>
                      <div className="text-lg font-bold tabular-nums">
                        {money(totalPot)}
                      </div>
                      <div className="text-[10px] text-brand-cream/60">
                        {roundSkins.length} skin{roundSkins.length === 1 ? "" : "s"}
                        {roundSkins.length > 0 && (
                          <>
                            {" "}
                            &middot;{" "}
                            <span className="text-brand-gold">
                              {money(skinValue)} each
                            </span>
                          </>
                        )}
                        {pot && Number(pot.carry_in) > 0 && (
                          <> &middot; carry-in {money(Number(pot.carry_in))}</>
                        )}
                        {pot && Number(pot.carry_out) > 0 && (
                          <> &middot; carries out {money(Number(pot.carry_out))}</>
                        )}
                      </div>
                    </div>
                  </div>

                  {dnpScores.length > 0 && (
                    <div className="mb-3 text-xs text-brand-cream/60">
                      <span className="uppercase tracking-widest text-brand-gold/80">
                        DNP:
                      </span>{" "}
                      {dnpScores
                        .map((s) => playerById.get(s.player_id)?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-brand-gold/80 border-b border-brand-gold/20">
                          <th className="py-2 pr-3">#</th>
                          <th className="py-2 pr-3">Player</th>
                          <th className="py-2 pr-3 text-right">Gross</th>
                          <th className="py-2 pr-3 text-right">CH</th>
                          <th className="py-2 pr-3 text-right">Net</th>
                          <th className="py-2 pr-3 text-right">Skins $</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playedScores.map((s, idx) => {
                          const p = playerById.get(s.player_id);
                          const earnings = skinsByPlayer.get(s.player_id) ?? 0;
                          return (
                            <tr
                              key={s.id}
                              className="border-b border-brand-gold/10 last:border-b-0"
                            >
                              <td className="py-2 pr-3 text-brand-cream/70 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="py-2 pr-3">{p?.name}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">
                                {s.gross}
                              </td>
                              <td className="py-2 pr-3 text-right tabular-nums text-brand-cream/70">
                                {s.course_handicap}
                              </td>
                              <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                                {s.net}
                              </td>
                              <td className="py-2 pr-3 text-right tabular-nums text-brand-gold">
                                {earnings > 0
                                  ? `$${Math.round(earnings)}`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <RoundScorecard
                    players={players}
                    scores={roundScoresAll}
                    holes={courseHoles}
                    holeScores={roundHoleScores}
                    skins={roundSkins}
                    skinValue={skinValue}
                  />

                  {(() => {
                    const roundAdjustments = adjustments.filter(
                      (a) => a.after_round === round.round_number,
                    );
                    if (roundAdjustments.length === 0) return null;
                    return (
                      <div className="mt-4 rounded-md border border-brand-gold/40 bg-brand-gold/10 p-4">
                        <div className="text-[10px] uppercase tracking-widest text-brand-gold mb-2 flex items-center gap-1.5">
                          <span>▼</span>
                          Handicap Adjustments After This Round
                        </div>
                        <ul className="space-y-1 text-sm">
                          {roundAdjustments.map((a) => {
                            const p = playerById.get(a.player_id);
                            return (
                              <li
                                key={a.id}
                                className="flex items-baseline justify-between gap-3"
                              >
                                <span className="font-semibold text-brand-cream">
                                  {p?.name ?? "—"}
                                </span>
                                <span className="text-xs text-brand-cream/60">
                                  avg diff {a.avg_differential} over{" "}
                                  {a.rounds_counted} rd
                                  {a.rounds_counted === 1 ? "" : "s"}
                                </span>
                                <span className="tabular-nums text-sm">
                                  <span className="text-brand-cream/60">
                                    {fmtIndex(a.old_index)}
                                  </span>
                                  <span className="text-brand-gold mx-1.5">
                                    →
                                  </span>
                                  <span className="text-brand-gold font-bold">
                                    {fmtIndex(a.new_index)}
                                  </span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })()}
                </>
              )}
            </section>
          );
        })()
      )}
    </div>
  );
}
