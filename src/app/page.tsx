import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getAll } from "@/lib/data";
import { computeLeaderboard } from "@/lib/scoring";
import { ordinal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { players, rounds, scores } = await getAll();
  const board = computeLeaderboard(players, rounds, scores);
  const completedRounds = rounds.filter((r) => r.status === "complete").length;
  const top3 = board.filter((r) => r.bestFourNet != null).slice(0, 3);

  return (
    <div>
      {/* HERO */}
      <section className="container-narrow pt-10 sm:pt-16 pb-8 text-center">
        <div className="flex justify-center mb-6">
          <Logo size="xl" withWordmark={false} />
        </div>

        <h1 className="h-display text-3xl sm:text-5xl md:text-6xl text-brand-cream font-bold leading-tight">
          The King Kong Cup
        </h1>

        <div className="gold-rule my-6" />

        <p className="font-serif text-xl sm:text-2xl text-brand-gold italic">
          Tae Kong&rsquo;s 50th Birthday
        </p>
        <p className="font-serif text-lg sm:text-xl text-brand-cream/85 mt-1">
          St. George, Utah &middot; May 27&ndash;31, 2026
        </p>

        <p className="max-w-2xl mx-auto mt-8 text-brand-cream/85 leading-relaxed">
          Celebrating half a century of Tae Kong. <br className="hidden sm:block" />
          <span className="text-brand-gold">No senior tees. No senior handicaps. No AARP discounts.</span>
          <br className="hidden sm:block" />
          Just 12 men and one old man&rsquo;s attempt to be as good once as he ever was.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/leaderboard" className="btn-gold">
            View Leaderboard
          </Link>
          <Link href="/info" className="btn-ghost">
            Tournament Info
          </Link>
        </div>
      </section>

      {/* LIVE LEADERBOARD PREVIEW */}
      <section className="container-narrow pt-4 pb-12">
        <div className="card p-5 sm:p-7">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="h-display text-brand-gold text-sm sm:text-base">
              Live Leaderboard
            </h2>
            <span className="text-xs text-brand-cream/60">
              {completedRounds === 0
                ? "Tees off May 27"
                : `Through R${completedRounds}`}
            </span>
          </div>

          {top3.length === 0 ? (
            <div className="text-center py-10">
              <div className="font-serif text-2xl text-brand-cream/70 italic">
                The field assembles.
              </div>
              <div className="text-sm text-brand-cream/50 mt-2">
                Standings will appear after Round 1.
              </div>
            </div>
          ) : (
            <ol className="space-y-3">
              {top3.map((row, idx) => (
                <li
                  key={row.player.id}
                  className={
                    "flex items-center justify-between rounded-lg px-4 py-3 " +
                    (idx === 0
                      ? "bg-brand-gold/15 ring-1 ring-brand-gold"
                      : "bg-brand-dark/40 border border-brand-gold/15")
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={
                        "text-2xl font-bold tabular-nums " +
                        (idx === 0 ? "text-brand-gold" : "text-brand-cream/80")
                      }
                    >
                      {ordinal(row.position)}
                    </div>
                    <div>
                      <div className="font-semibold">{row.player.name}</div>
                      <div className="text-xs text-brand-cream/60">
                        Index {row.player.current_index.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-brand-cream/50">
                      Best 4 Net
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {row.bestFourNet}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/leaderboard"
              className="text-sm text-brand-gold hover:text-brand-cream uppercase tracking-widest font-semibold"
            >
              Full Standings &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="container-narrow pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLink href="/daily" label="Daily Results" />
          <QuickLink href="/skins" label="Skins Tracker" />
          <QuickLink href="/bonus" label="Bonus Awards" />
          <QuickLink href="/info" label="Rules & Field" />
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="card px-4 py-5 text-center hover:bg-brand-gold/10 transition"
    >
      <div className="h-display text-brand-gold text-xs sm:text-sm">{label}</div>
    </Link>
  );
}
