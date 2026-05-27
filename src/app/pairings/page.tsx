import { getAll } from "@/lib/data";
import { fmtDate, fmtIndex } from "@/lib/format";
import {
  dynamicR5Pairings,
  staticPairingsFor,
  type PairingGroup,
} from "@/lib/pairings";
import { computeLeaderboard } from "@/lib/scoring";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PairingsPage() {
  const { players, courses, rounds, scores } = await getAll();
  const playerById = new Map(players.map((p) => [p.id, p]));
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

  const board = computeLeaderboard(players, rounds, scores);
  const r5HasResults = sortedRounds[4] && sortedRounds[4].status === "complete";

  return (
    <div className="container-narrow pt-8 pb-12">
      <header className="mb-6">
        <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold">
          Pairings
        </h1>
        <p className="text-sm text-brand-cream/70 mt-1">
          Groups for each round. R1–R4 are pre-set. R5 groups by standings
          going into the final — bottom 4 off first, top 4 (Marquee) off last.
        </p>
      </header>

      <div className="space-y-5">
        {sortedRounds.map((round) => {
          const course = courseById.get(round.course_id);
          let groups: PairingGroup[] | null;
          let dynamicNote: string | null = null;

          if (round.round_number === 5) {
            groups = dynamicR5Pairings(players, board);
            dynamicNote = r5HasResults
              ? "Final groupings used for Round 5."
              : "Live preview — recomputed as standings change.";
          } else {
            groups = staticPairingsFor(round.round_number, players);
          }

          return (
            <section key={round.id} className="card p-5">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
                <div>
                  <div className="h-display text-brand-gold text-sm">
                    Round {round.round_number}
                  </div>
                  <div className="font-serif text-xl text-brand-cream mt-0.5">
                    {course?.name ?? "TBD"}
                  </div>
                </div>
                <div className="text-xs text-brand-cream/70 text-right">
                  {fmtDate(round.played_on)}
                </div>
              </div>

              {dynamicNote && (
                <div className="text-[11px] uppercase tracking-widest text-brand-gold/70 mb-3">
                  {dynamicNote}
                </div>
              )}

              {!groups || groups.length === 0 ? (
                <div className="text-sm font-serif italic text-brand-cream/50">
                  No pairings yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {groups.map((g, idx) => (
                    <GroupCard
                      key={idx}
                      group={g}
                      playerById={playerById}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* R5 seeding methodology blurb */}
      <section className="card p-4 mt-5 text-xs text-brand-cream/60">
        <div className="text-[11px] uppercase tracking-widest text-brand-gold/80 mb-1">
          R5 Seeding
        </div>
        Standings going into R5 use each player&rsquo;s sum of net scores. For
        anyone with fewer than 4 played rounds (e.g. Hoffmann skipping R3),
        the seeding value is their average net × 4 so they compare fairly
        with 4-round players. The final&rsquo;s tee order is bottom group
        first, Marquee group last.
      </section>
    </div>
  );
}

function GroupCard({
  group,
  playerById,
}: {
  group: PairingGroup;
  playerById: Map<string, Player>;
}) {
  return (
    <div
      className={
        "rounded-md p-3 border " +
        (group.marquee
          ? "border-brand-gold/60 bg-brand-gold/10"
          : "border-brand-gold/20 bg-brand-dark/30")
      }
    >
      <div className="text-[10px] uppercase tracking-widest text-brand-gold/85">
        {group.label}
      </div>
      {group.subtitle && (
        <div className="text-[10px] text-brand-cream/55 mb-1">
          {group.subtitle}
        </div>
      )}
      <ul className="mt-1 text-sm space-y-0.5">
        {group.players.length === 0 && (
          <li className="text-brand-cream/40 italic">No players</li>
        )}
        {group.players.map((pid) => {
          const p = playerById.get(pid);
          if (!p) return null;
          return (
            <li
              key={pid}
              className="flex items-baseline justify-between gap-2"
            >
              <span className="text-brand-cream">{p.name}</span>
              <span className="text-[10px] text-brand-cream/50 tabular-nums">
                {fmtIndex(p.current_index)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
