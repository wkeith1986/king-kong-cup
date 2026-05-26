import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAll } from "@/lib/data";
import { fmtDate, fmtIndex } from "@/lib/format";
import { logoutAction } from "./actions";
import { SeedPanel } from "./SeedPanel";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  if (!isAdminAuthenticated()) {
    redirect("/admin/login");
  }
  const { players, courses, tees, rounds, scores, adjustments } = await getAll();
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

  return (
    <div className="container-narrow pt-8 pb-12">
      <div className="flex items-baseline justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold">
            Admin Dashboard
          </h1>
          <p className="text-sm text-brand-cream/70 mt-1">
            Enter scores after each round. Public pages refresh automatically.
          </p>
        </div>
        <form action={logoutAction}>
          <button className="btn-ghost text-sm">Sign Out</button>
        </form>
      </div>

      <div className="mb-6">
        <SeedPanel
          initialCounts={{
            players: players.length,
            courses: courses.length,
            tees: tees.length,
            rounds: rounds.length,
          }}
        />
      </div>

      <section className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/admin/players"
          className="card p-4 flex items-center justify-between hover:bg-brand-gold/10 transition"
        >
          <div>
            <div className="h-display text-brand-gold text-sm">Players</div>
            <div className="text-sm text-brand-cream/70 mt-0.5">
              Swap golfers, edit names and handicaps, add a substitute.
            </div>
          </div>
          <span className="text-brand-gold/60 text-xs uppercase tracking-widest">
            Manage →
          </span>
        </Link>
        <Link
          href="/admin/courses"
          className="card p-4 flex items-center justify-between hover:bg-brand-gold/10 transition"
        >
          <div>
            <div className="h-display text-brand-gold text-sm">Courses</div>
            <div className="text-sm text-brand-cream/70 mt-0.5">
              Edit tees, ratings, slopes, and per-hole par + stroke index.
            </div>
          </div>
          <span className="text-brand-gold/60 text-xs uppercase tracking-widest">
            Manage →
          </span>
        </Link>
      </section>

      <section className="mb-8">
        <h2 className="h-display text-brand-gold text-sm mb-3">Rounds</h2>
        {sortedRounds.length === 0 && (
          <div className="card p-5 text-sm text-brand-cream/70">
            No rounds yet. Click <strong>Load Field, Courses &amp; Rounds</strong> above to set them up.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedRounds.map((r) => {
            const course = courseById.get(r.course_id);
            const roundScores = scores.filter((s) => s.round_id === r.id);
            const complete = r.status === "complete";
            return (
              <Link
                key={r.id}
                href={`/admin/rounds/${r.round_number}`}
                className="card p-4 hover:bg-brand-gold/10 transition"
              >
                <div className="flex items-baseline justify-between">
                  <div className="h-display text-brand-gold">Round {r.round_number}</div>
                  <span
                    className={
                      "text-[10px] uppercase tracking-widest px-2 py-0.5 rounded " +
                      (complete
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-brand-cream/10 text-brand-cream/60")
                    }
                  >
                    {complete ? "Complete" : "Pending"}
                  </span>
                </div>
                <div className="mt-2 font-serif text-lg text-brand-cream">
                  {course?.name ?? "TBD"}
                </div>
                <div className="text-xs text-brand-cream/60 mt-0.5">
                  {fmtDate(r.played_on)} &middot; {roundScores.length} scores entered
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="h-display text-brand-gold text-sm mb-3">Field</h2>
        <div className="card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[...players]
              .sort((a, b) => a.starting_index - b.starting_index)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-1.5 rounded bg-brand-dark/30"
                >
                  <span>{p.name}</span>
                  <span className="tabular-nums text-brand-cream/85">
                    {fmtIndex(p.current_index)}
                    {p.current_index !== p.starting_index && (
                      <span className="text-xs text-brand-cream/40 ml-1">
                        (start {fmtIndex(p.starting_index)})
                      </span>
                    )}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </section>

      {adjustments.length > 0 && (
        <section>
          <h2 className="h-display text-brand-gold text-sm mb-3">
            Handicap Adjustments
          </h2>
          <div className="card p-4 text-sm">
            <ul className="space-y-1">
              {adjustments.map((a) => {
                const player = players.find((p) => p.id === a.player_id);
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between py-1 border-b border-brand-gold/10 last:border-b-0"
                  >
                    <span>
                      <span className="font-semibold">{player?.name}</span>
                      <span className="text-brand-cream/60 ml-2 text-xs">
                        After R{a.after_round} &middot; avg diff {a.avg_differential} over {a.rounds_counted} rds
                      </span>
                    </span>
                    <span className="tabular-nums">
                      {fmtIndex(a.old_index)} → {" "}
                      <span className="text-brand-gold font-bold">
                        {fmtIndex(a.new_index)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
