import { getAll } from "@/lib/data";
import { money } from "@/lib/format";
import { BONUS_PRIZES } from "@/lib/payouts";

export const dynamic = "force-dynamic";

export default async function BonusPage() {
  const { players, scores, holeScores } = await getAll();
  const playerById = new Map(players.map((p) => [p.id, p]));

  const eligibleScores = scores.filter(
    (s) => !s.did_not_play && s.gross != null && s.net != null,
  );

  // Low gross — split across all players tied at the minimum.
  const lowGrossValue =
    eligibleScores.length > 0
      ? Math.min(...eligibleScores.map((s) => s.gross as number))
      : null;
  const lowGrossWinners =
    lowGrossValue == null
      ? []
      : Array.from(
          new Set(
            eligibleScores
              .filter((s) => (s.gross as number) === lowGrossValue)
              .map((s) => s.player_id),
          ),
        )
          .map((id) => playerById.get(id)?.name)
          .filter((n): n is string => !!n);

  const lowNetValue =
    eligibleScores.length > 0
      ? Math.min(...eligibleScores.map((s) => s.net as number))
      : null;
  const lowNetWinners =
    lowNetValue == null
      ? []
      : Array.from(
          new Set(
            eligibleScores
              .filter((s) => (s.net as number) === lowNetValue)
              .map((s) => s.player_id),
          ),
        )
          .map((id) => playerById.get(id)?.name)
          .filter((n): n is string => !!n);

  // Net birdies — split across players with the most.
  const birdieCount = new Map<string, number>();
  for (const h of holeScores) {
    if (h.net_to_par <= -1) {
      birdieCount.set(h.player_id, (birdieCount.get(h.player_id) ?? 0) + 1);
    }
  }
  const maxBirdies = Math.max(0, ...birdieCount.values());
  const birdieWinners =
    maxBirdies > 0
      ? [...birdieCount.entries()]
          .filter(([, n]) => n === maxBirdies)
          .map(([id]) => playerById.get(id)?.name)
          .filter((n): n is string => !!n)
      : [];

  return (
    <div className="container-narrow pt-8 pb-12">
      <header className="mb-6">
        <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold">
          Bonus Awards
        </h1>
        <p className="text-sm text-brand-cream/70 mt-1">
          $500 in side action, awarded after the final round. Ties split the
          prize evenly.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Award
          title="Lowest Gross Round"
          prize={BONUS_PRIZES.lowGross}
          winners={lowGrossWinners}
          stat={lowGrossValue != null ? String(lowGrossValue) : null}
          statLabel="Gross"
        />
        <Award
          title="Lowest Net Round"
          prize={BONUS_PRIZES.lowNet}
          winners={lowNetWinners}
          stat={lowNetValue != null ? String(lowNetValue) : null}
          statLabel="Net"
        />
        <Award
          title="Most Net Birdies"
          prize={BONUS_PRIZES.netBirdies}
          winners={birdieWinners}
          stat={maxBirdies > 0 ? String(maxBirdies) : null}
          statLabel="Birdies"
        />
      </div>
    </div>
  );
}

function Award({
  title,
  prize,
  winners,
  stat,
  statLabel,
}: {
  title: string;
  prize: number;
  winners: string[];
  stat: string | null;
  statLabel: string;
}) {
  const tied = winners.length > 1;
  const share = winners.length > 0 ? prize / winners.length : 0;
  return (
    <div className="card p-5 text-center">
      <div className="h-display text-brand-gold text-xs mb-2">{title}</div>
      <div className="font-serif text-3xl text-brand-cream font-bold">
        {money(prize)}
      </div>
      <div className="gold-rule my-4" />
      {winners.length === 0 ? (
        <div className="font-serif italic text-brand-cream/50">
          Up for grabs
        </div>
      ) : (
        <>
          <div className="font-semibold text-brand-cream">
            {winners.join(", ")}
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{stat}</div>
          <div className="text-[10px] uppercase tracking-widest text-brand-cream/50">
            {statLabel}
            {tied && (
              <span className="text-brand-gold ml-2 normal-case">
                · split {money(share)} each
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
