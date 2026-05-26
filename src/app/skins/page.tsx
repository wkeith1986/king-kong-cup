import { getAll } from "@/lib/data";
import { money } from "@/lib/format";
import { totalSkinsByPlayer } from "@/lib/skins";

export const dynamic = "force-dynamic";

export default async function SkinsPage() {
  const { players, rounds, skins, skinPots } = await getAll();
  const playerById = new Map(players.map((p) => [p.id, p]));
  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);
  const totals = totalSkinsByPlayer(skins);

  // Build per-player totals sorted high to low.
  const totalsList = [...players]
    .map((p) => ({ player: p, total: totals.get(p.id) ?? 0 }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="container-narrow pt-8 pb-12">
      <header className="mb-6">
        <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold">
          Skins
        </h1>
        <p className="text-sm text-brand-cream/70 mt-1">
          $300 per round. Net par or better. Sole low net wins. Carries forward
          if no skins are won.
        </p>
      </header>

      <section className="card p-5 mb-6">
        <h2 className="h-display text-brand-gold text-sm mb-3">Running Totals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {totalsList.map((row, idx) => (
            <div
              key={row.player.id}
              className={
                "flex items-center justify-between px-3 py-2 rounded-md " +
                (idx === 0 && row.total > 0
                  ? "bg-brand-gold/15 ring-1 ring-brand-gold/40"
                  : "bg-brand-dark/30 border border-brand-gold/10")
              }
            >
              <div className="font-medium">{row.player.name}</div>
              <div
                className={
                  "tabular-nums font-bold " +
                  (row.total > 0 ? "text-brand-gold" : "text-brand-cream/40")
                }
              >
                {row.total > 0 ? money(row.total) : "—"}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-5">
        {sortedRounds.map((round) => {
          const pot = skinPots.find((p) => p.round_id === round.id);
          const roundSkins = skins
            .filter((s) => s.round_id === round.id)
            .sort((a, b) => a.hole_number - b.hole_number);
          return (
            <section key={round.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h2 className="h-display text-brand-gold text-base">
                  Round {round.round_number}
                </h2>
                <div className="text-xs text-brand-cream/70 text-right">
                  <div>
                    Base pot:{" "}
                    <span className="text-brand-cream">
                      {money(pot?.base_pot ?? 300)}
                    </span>
                    {pot && Number(pot.carry_in) > 0 && (
                      <>
                        {" "}+ carry-in{" "}
                        <span className="text-brand-cream">
                          {money(pot.carry_in)}
                        </span>
                      </>
                    )}
                  </div>
                  {pot && Number(pot.carry_out) > 0 && (
                    <div className="text-brand-gold mt-0.5">
                      No skins won — {money(pot.carry_out)} carries forward.
                    </div>
                  )}
                </div>
              </div>

              {roundSkins.length === 0 ? (
                <div className="text-center py-6 font-serif italic text-brand-cream/50">
                  {round.status === "complete"
                    ? "No skins won this round."
                    : "Awaiting results."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-brand-gold/80 border-b border-brand-gold/20">
                        <th className="py-2 pr-3">Hole</th>
                        <th className="py-2 pr-3">Winner</th>
                        <th className="py-2 pr-3 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roundSkins.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-brand-gold/10 last:border-b-0"
                        >
                          <td className="py-2 pr-3 tabular-nums">
                            {s.hole_number}
                          </td>
                          <td className="py-2 pr-3">
                            {playerById.get(s.winner_player_id)?.name}
                          </td>
                          <td className="py-2 pr-3 text-right font-semibold text-brand-gold tabular-nums">
                            {money(s.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
