import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintableScorecard } from "@/components/PrintableScorecard";
import { getAll } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { slugifyName } from "@/lib/slug";
import { PlayerPicker } from "./PlayerPicker";

export const dynamic = "force-dynamic";

export default async function CardsRoundPage({
  params,
  searchParams,
}: {
  params: { round: string };
  searchParams?: { player?: string };
}) {
  const roundNumber = Number(params.round);
  if (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 5) {
    notFound();
  }

  const { players, courses, tees, holes, rounds } = await getAll();
  const round = rounds.find((r) => r.round_number === roundNumber);
  if (!round) notFound();

  const course = courses.find((c) => c.id === round.course_id) ?? null;
  const tee = round.tee_id ? (tees.find((t) => t.id === round.tee_id) ?? null) : null;
  const courseHoles = holes
    .filter((h) => h.course_id === round.course_id)
    .sort((a, b) => a.hole_number - b.hole_number);
  const sortedPlayers = [...players].sort((a, b) => a.sort_order - b.sort_order);

  const playerSlug = searchParams?.player?.trim().toLowerCase() ?? "";
  const filteredPlayers = playerSlug
    ? sortedPlayers.filter((p) => slugifyName(p.name) === playerSlug)
    : sortedPlayers;
  const isFiltered = playerSlug.length > 0 && filteredPlayers.length === 1;

  return (
    <div className="container-narrow pt-6 pb-12">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Link
            href="/cards"
            className="text-xs uppercase tracking-widest text-brand-cream/60 hover:text-brand-gold"
          >
            ← All rounds
          </Link>
          <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold mt-1">
            {isFiltered
              ? `${filteredPlayers[0].name} · R${round.round_number}`
              : `Round ${round.round_number} · Pop Cards`}
          </h1>
          <div className="text-sm text-brand-cream/70 mt-1">
            {course?.name ?? "TBD"} &middot; {fmtDate(round.played_on)}
            {tee ? (
              <>
                {" "}
                &middot;{" "}
                <span className="text-brand-cream">
                  {tee.name} (Rating {tee.rating} / Slope {tee.slope})
                </span>
              </>
            ) : (
              <span className="text-rose-300 ml-1">
                · Tee not selected yet — pick one on Admin → Round {round.round_number}.
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Link
              key={n}
              href={
                playerSlug ? `/cards/${n}?player=${playerSlug}` : `/cards/${n}`
              }
              className={
                "px-3 py-1.5 rounded-md text-xs uppercase tracking-wider border transition " +
                (n === roundNumber
                  ? "bg-brand-gold text-brand-dark border-brand-gold"
                  : "border-brand-gold/30 text-brand-cream/80 hover:bg-brand-gold/10")
              }
            >
              R{n}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <PlayerPicker players={sortedPlayers} roundNumber={roundNumber} />
        {playerSlug && filteredPlayers.length === 0 && (
          <div className="mt-3 text-xs text-rose-300">
            No player named &ldquo;{playerSlug}&rdquo;. Pick a name above or
            clear the filter.
          </div>
        )}
      </div>

      {courseHoles.length !== 18 && (
        <div className="mb-5 rounded-md px-4 py-3 text-sm bg-rose-500/15 text-rose-200 border border-rose-500/30">
          Course is missing hole data ({courseHoles.length} of 18 holes set up).
          Add par + stroke index in <Link href="/admin/courses" className="underline">Admin → Courses</Link> first.
        </div>
      )}

      <div className="space-y-5">
        {filteredPlayers.map((p) => (
          <PrintableScorecard
            key={p.id}
            player={p}
            course={course}
            tee={tee}
            holes={courseHoles}
            playedOn={round.played_on}
            roundNumber={round.round_number}
          />
        ))}
      </div>
    </div>
  );
}
