import Link from "next/link";
import { getAll } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { slugifyName } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function CardsIndexPage() {
  const { players, courses, tees, holes, rounds } = await getAll();
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const teeById = new Map(tees.map((t) => [t.id, t]));
  const sortedPlayers = [...players].sort((a, b) => a.sort_order - b.sort_order);

  const holeCountByCourse = new Map<string, number>();
  for (const h of holes) {
    holeCountByCourse.set(
      h.course_id,
      (holeCountByCourse.get(h.course_id) ?? 0) + 1,
    );
  }

  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

  return (
    <div className="container-narrow pt-8 pb-12">
      <header className="mb-6">
        <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold">
          Pop Cards
        </h1>
        <p className="text-sm text-brand-cream/70 mt-1">
          Pull up your card on the tee to see which holes you get strokes on,
          then mark up your scorecard accordingly.
        </p>
      </header>

      {sortedPlayers.length > 0 && (
        <section className="card p-4 mb-5">
          <div className="text-xs uppercase tracking-widest text-brand-gold/80 mb-2">
            Just my card
          </div>
          <p className="text-xs text-brand-cream/60 mb-3">
            Tap your name to jump straight to your cards. Bookmark the page on
            your phone so you can pull it up at the tee.
          </p>
          <div className="flex flex-wrap gap-2">
            {sortedPlayers.map((p) => (
              <Link
                key={p.id}
                href={`/cards/1?player=${slugifyName(p.name)}`}
                className="px-3 py-1.5 rounded-md text-sm border border-brand-gold/30 text-brand-cream/85 hover:bg-brand-gold/10 transition"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sortedRounds.map((r) => {
          const course = courseById.get(r.course_id);
          const tee = r.tee_id ? teeById.get(r.tee_id) : null;
          const teeReady = !!tee;
          const holesReady = (holeCountByCourse.get(r.course_id) ?? 0) === 18;
          const ready = teeReady && holesReady;
          return (
            <Link
              key={r.id}
              href={`/cards/${r.round_number}`}
              className={
                "card p-4 flex items-start justify-between gap-3 transition " +
                (ready
                  ? "hover:bg-brand-gold/10"
                  : "opacity-80 hover:bg-brand-gold/5")
              }
            >
              <div>
                <div className="h-display text-brand-gold text-sm">
                  Round {r.round_number}
                </div>
                <div className="font-serif text-lg text-brand-cream mt-0.5">
                  {course?.name ?? "TBD"}
                </div>
                <div className="text-xs text-brand-cream/60 mt-0.5">
                  {fmtDate(r.played_on)}
                  {tee ? (
                    <>
                      {" "}
                      &middot;{" "}
                      <span className="text-brand-cream/85">
                        {tee.name} (R {tee.rating} / S {tee.slope})
                      </span>
                    </>
                  ) : (
                    <span className="text-rose-300 ml-1">· No tee selected</span>
                  )}
                </div>
                {!holesReady && (
                  <div className="text-[10px] text-rose-300 mt-1">
                    Course missing hole data
                  </div>
                )}
              </div>
              <span className="text-brand-gold/60 text-xs uppercase tracking-widest shrink-0">
                {ready ? "Open →" : "Setup →"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
