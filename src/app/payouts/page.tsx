import { getAll } from "@/lib/data";
import { money } from "@/lib/format";
import {
  assignPrizes,
  BONUS_PRIZES,
  KKC_PRIZES,
  scalePrizes,
  SKINS_BASE_POT_PER_ROUND,
  totalPrizes,
} from "@/lib/payouts";
import { computeLeaderboard } from "@/lib/scoring";
import { totalSkinsByPlayer } from "@/lib/skins";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const {
    players,
    rounds,
    scores,
    holeScores,
    skins,
    skinPots,
  } = await getAll();
  const playerById = new Map(players.map((p) => [p.id, p]));

  // ---------------- KING KONG CUP ----------------
  const board = computeLeaderboard(players, rounds, scores);

  // Final-round skins carryout rolls into the KKC pot. We only count carryout
  // from the LAST round (R5 in this trip); intermediate carries are already
  // chained forward by the skins logic.
  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);
  const lastRound = sortedRounds[sortedRounds.length - 1];
  const lastRoundPot = lastRound
    ? skinPots.find((p) => p.round_id === lastRound.id)
    : undefined;
  const skinsCarryOver =
    lastRound?.status === "complete" && lastRoundPot
      ? Number(lastRoundPot.carry_out)
      : 0;

  const kkcBase = totalPrizes(KKC_PRIZES);
  const kkcPot = kkcBase + skinsCarryOver;
  const adjustedPrizes =
    skinsCarryOver > 0
      ? scalePrizes(KKC_PRIZES, kkcPot / kkcBase)
      : [...KKC_PRIZES];

  const kkcAssignments = assignPrizes(
    board,
    (row) => row.bestFourNet,
    adjustedPrizes,
  );

  // ---------------- DAILY SKINS ----------------
  const skinsTotalByPlayer = totalSkinsByPlayer(skins);
  const skinsRanked = [...players]
    .map((p) => ({
      player: p,
      total: Number(skinsTotalByPlayer.get(p.id) ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  // ---------------- BONUS AWARDS ----------------
  const eligibleScores = scores.filter(
    (s) => !s.did_not_play && s.gross != null && s.net != null,
  );

  // Best single-round low gross
  const lowGrossPlayers: Player[] = (() => {
    if (eligibleScores.length === 0) return [];
    const min = Math.min(...eligibleScores.map((s) => s.gross as number));
    const winners = eligibleScores.filter((s) => (s.gross as number) === min);
    const ids = Array.from(new Set(winners.map((s) => s.player_id)));
    return ids.map((id) => playerById.get(id)).filter((p): p is Player => !!p);
  })();
  const lowGrossValue =
    eligibleScores.length > 0
      ? Math.min(...eligibleScores.map((s) => s.gross as number))
      : null;

  const lowNetPlayers: Player[] = (() => {
    if (eligibleScores.length === 0) return [];
    const min = Math.min(...eligibleScores.map((s) => s.net as number));
    const winners = eligibleScores.filter((s) => (s.net as number) === min);
    const ids = Array.from(new Set(winners.map((s) => s.player_id)));
    return ids.map((id) => playerById.get(id)).filter((p): p is Player => !!p);
  })();
  const lowNetValue =
    eligibleScores.length > 0
      ? Math.min(...eligibleScores.map((s) => s.net as number))
      : null;

  const birdieCount = new Map<string, number>();
  for (const h of holeScores) {
    if (h.net_to_par <= -1) {
      birdieCount.set(h.player_id, (birdieCount.get(h.player_id) ?? 0) + 1);
    }
  }
  const maxBirdies = Math.max(0, ...birdieCount.values());
  const birdieWinners: Player[] = [...birdieCount.entries()]
    .filter(([, n]) => n === maxBirdies && n > 0)
    .map(([id]) => playerById.get(id))
    .filter((p): p is Player => !!p);

  // ---------------- GRAND TOTALS ----------------
  const grandTotal = new Map<string, number>();
  const add = (pid: string, n: number) => {
    grandTotal.set(pid, (grandTotal.get(pid) ?? 0) + n);
  };
  for (const a of kkcAssignments) {
    if (a.prize > 0) add(a.player.player.id, a.prize);
  }
  for (const [pid, amt] of skinsTotalByPlayer) {
    if (amt > 0) add(pid, Number(amt));
  }
  if (lowGrossPlayers.length > 0) {
    const share = BONUS_PRIZES.lowGross / lowGrossPlayers.length;
    lowGrossPlayers.forEach((p) => add(p.id, share));
  }
  if (lowNetPlayers.length > 0) {
    const share = BONUS_PRIZES.lowNet / lowNetPlayers.length;
    lowNetPlayers.forEach((p) => add(p.id, share));
  }
  if (birdieWinners.length > 0) {
    const share = BONUS_PRIZES.netBirdies / birdieWinners.length;
    birdieWinners.forEach((p) => add(p.id, share));
  }
  const grandRanked = [...players]
    .map((p) => ({ player: p, total: grandTotal.get(p.id) ?? 0 }))
    .sort((a, b) => b.total - a.total);

  // Sanity-check: pot allocated should equal $6,000 once the trip is over.
  const totalAllocated = grandRanked.reduce((s, r) => s + r.total, 0);
  const totalPot = kkcPot + SKINS_BASE_POT_PER_ROUND * 5 + totalPrizes(Object.values(BONUS_PRIZES));

  return (
    <div className="container-narrow pt-8 pb-12">
      <header className="mb-6">
        <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold">
          Payouts
        </h1>
        <p className="text-sm text-brand-cream/70 mt-1">
          Who&rsquo;s collecting what. Updates live as rounds are entered;
          final once Round 5 is in the books.
        </p>
      </header>

      {/* Pot summary */}
      <section className="card p-5 mb-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="h-display text-brand-gold text-sm">Total Pot</h2>
          <div className="font-serif text-2xl text-brand-cream font-bold">
            {money(totalPot)}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-md border border-brand-gold/20 bg-brand-dark/30 p-3">
            <div className="text-[10px] uppercase tracking-widest text-brand-gold">
              King Kong Cup
            </div>
            <div className="font-bold text-lg tabular-nums">{money(kkcPot)}</div>
            {skinsCarryOver > 0 && (
              <div className="text-[10px] text-brand-cream/60 mt-0.5">
                base {money(kkcBase)} + {money(skinsCarryOver)} skins carryover
              </div>
            )}
          </div>
          <div className="rounded-md border border-brand-gold/20 bg-brand-dark/30 p-3">
            <div className="text-[10px] uppercase tracking-widest text-brand-gold">
              Daily Skins
            </div>
            <div className="font-bold text-lg tabular-nums">
              {money(SKINS_BASE_POT_PER_ROUND * 5)}
            </div>
            <div className="text-[10px] text-brand-cream/60 mt-0.5">
              {SKINS_BASE_POT_PER_ROUND}/round × 5
            </div>
          </div>
          <div className="rounded-md border border-brand-gold/20 bg-brand-dark/30 p-3">
            <div className="text-[10px] uppercase tracking-widest text-brand-gold">
              Bonus
            </div>
            <div className="font-bold text-lg tabular-nums">
              {money(totalPrizes(Object.values(BONUS_PRIZES)))}
            </div>
            <div className="text-[10px] text-brand-cream/60 mt-0.5">
              gross / net / birdies
            </div>
          </div>
        </div>
      </section>

      {/* King Kong Cup */}
      <section className="card p-5 mb-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="h-display text-brand-gold text-sm">King Kong Cup</h2>
          <div className="text-xs text-brand-cream/60">
            Best-4 Net &middot; lowest wins
          </div>
        </div>
        {board.every((r) => r.bestFourNet == null) ? (
          <div className="text-sm font-serif italic text-brand-cream/60">
            No rounds played yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-brand-gold/80 border-b border-brand-gold/20">
                <th className="py-2 pr-3">Pos</th>
                <th className="py-2 pr-3">Player</th>
                <th className="py-2 pr-3 text-right">Best 4</th>
                <th className="py-2 pr-3 text-right">Prize</th>
              </tr>
            </thead>
            <tbody>
              {kkcAssignments
                .filter((a) => a.prize > 0 || a.position != null)
                .map((a) => (
                  <tr
                    key={a.player.player.id}
                    className={
                      "border-b border-brand-gold/10 last:border-b-0 " +
                      (a.prize > 0 ? "" : "text-brand-cream/55")
                    }
                  >
                    <td className="py-2 pr-3 tabular-nums font-bold text-brand-gold">
                      {a.position == null
                        ? "—"
                        : a.isTied
                          ? `T${a.position}`
                          : a.position}
                    </td>
                    <td className="py-2 pr-3">{a.player.player.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {a.player.bestFourNet ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-brand-gold">
                      {a.prize > 0 ? money(a.prize) : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
        {skinsCarryOver > 0 && (
          <div className="mt-3 text-xs text-brand-cream/60">
            <span className="text-brand-gold">{money(skinsCarryOver)}</span> in
            unclaimed Round 5 skins rolled into the KKC pot and was distributed
            pro rata across positions.
          </div>
        )}
      </section>

      {/* Skins running totals */}
      <section className="card p-5 mb-5">
        <h2 className="h-display text-brand-gold text-sm mb-3">Daily Skins</h2>
        {skinsRanked.every((r) => r.total === 0) ? (
          <div className="text-sm font-serif italic text-brand-cream/60">
            No skins won yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {skinsRanked
              .filter((r) => r.total > 0)
              .map((r) => (
                <div
                  key={r.player.id}
                  className="flex items-center justify-between px-3 py-1.5 rounded-md bg-brand-dark/30 border border-brand-gold/10"
                >
                  <span>{r.player.name}</span>
                  <span className="tabular-nums text-brand-gold font-semibold">
                    {money(r.total)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Bonus awards */}
      <section className="card p-5 mb-5">
        <h2 className="h-display text-brand-gold text-sm mb-3">Bonus Awards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <BonusAward
            title="Low Gross Round"
            prize={BONUS_PRIZES.lowGross}
            winners={lowGrossPlayers.map((p) => p.name)}
            stat={lowGrossValue != null ? `${lowGrossValue}` : null}
            statLabel="Gross"
          />
          <BonusAward
            title="Low Net Round"
            prize={BONUS_PRIZES.lowNet}
            winners={lowNetPlayers.map((p) => p.name)}
            stat={lowNetValue != null ? `${lowNetValue}` : null}
            statLabel="Net"
          />
          <BonusAward
            title="Most Net Birdies"
            prize={BONUS_PRIZES.netBirdies}
            winners={birdieWinners.map((p) => p.name)}
            stat={maxBirdies > 0 ? String(maxBirdies) : null}
            statLabel="Birdies"
          />
        </div>
      </section>

      {/* Grand total per player */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="h-display text-brand-gold text-sm">Total Winnings</h2>
          <div className="text-xs text-brand-cream/60 tabular-nums">
            {money(totalAllocated)} / {money(totalPot)} allocated
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {grandRanked.map((r) => (
              <tr
                key={r.player.id}
                className="border-b border-brand-gold/10 last:border-b-0"
              >
                <td className="py-1.5 pr-3">{r.player.name}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums font-semibold">
                  {r.total > 0 ? (
                    <span className="text-brand-gold">{money(r.total)}</span>
                  ) : (
                    <span className="text-brand-cream/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function BonusAward({
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
    <div className="rounded-md border border-brand-gold/20 bg-brand-dark/30 p-4 text-center">
      <div className="h-display text-brand-gold text-xs mb-1">{title}</div>
      <div className="font-serif text-2xl text-brand-cream font-bold">
        {money(prize)}
      </div>
      <div className="gold-rule my-3" />
      {winners.length === 0 ? (
        <div className="font-serif italic text-brand-cream/50 text-sm">
          Up for grabs
        </div>
      ) : (
        <>
          <div className="font-semibold text-brand-cream text-sm">
            {winners.join(", ")}
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums">{stat}</div>
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
