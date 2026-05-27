"use client";

import { useState, useTransition } from "react";
import type { Player } from "@/lib/types";
import { money } from "@/lib/format";
import { setPlayerPaidAction } from "../admin/actions";

const BUY_IN = 500;

export function EntriesTracker({ players }: { players: Player[] }) {
  // Optimistic local state so the UI updates instantly even before the
  // server round-trip completes (or fails).
  const [paidById, setPaidById] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const p of players) init[p.id] = !!p.paid_entry;
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [, start] = useTransition();

  const sorted = [...players].sort((a, b) => a.sort_order - b.sort_order);
  const paidCount = sorted.filter((p) => paidById[p.id]).length;
  const collected = paidCount * BUY_IN;
  const owed = (sorted.length - paidCount) * BUY_IN;

  const toggle = (player: Player) => {
    const next = !paidById[player.id];
    // Optimistic
    setPaidById((prev) => ({ ...prev, [player.id]: next }));
    setPendingIds((prev) => new Set(prev).add(player.id));
    setError(null);
    start(async () => {
      const res = await setPlayerPaidAction({
        playerId: player.id,
        paid: next,
      });
      setPendingIds((prev) => {
        const copy = new Set(prev);
        copy.delete(player.id);
        return copy;
      });
      if (!res.ok) {
        // Roll back the optimistic flip on failure.
        setPaidById((prev) => ({ ...prev, [player.id]: !next }));
        setError(
          res.error.includes("redirect")
            ? "Sign in as admin to toggle entries."
            : res.error,
        );
      }
    });
  };

  return (
    <section className="card p-5 mb-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <h2 className="h-display text-brand-gold text-sm">Entries</h2>
        <div className="text-xs text-brand-cream/70 tabular-nums">
          <span className="text-brand-gold font-semibold">
            {paidCount}/{sorted.length}
          </span>{" "}
          paid &middot;{" "}
          <span className="text-brand-cream">{money(collected)}</span>{" "}
          collected{" "}
          {owed > 0 && (
            <span className="text-rose-300">
              &middot; {money(owed)} outstanding
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-brand-cream/55 mb-3">
        {money(BUY_IN)} buy-in per player. Tick the box when you collect cash.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {sorted.map((p) => {
          const paid = !!paidById[p.id];
          const pending = pendingIds.has(p.id);
          return (
            <label
              key={p.id}
              className={
                "flex items-center justify-between px-3 py-2 rounded-md border cursor-pointer transition " +
                (paid
                  ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15"
                  : "border-brand-gold/20 bg-brand-dark/30 hover:bg-brand-gold/10") +
                (pending ? " opacity-70" : "")
              }
            >
              <span className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-500"
                  checked={paid}
                  onChange={() => toggle(p)}
                  disabled={pending}
                />
                <span className="text-sm">{p.name}</span>
              </span>
              <span
                className={
                  "text-[10px] uppercase tracking-widest tabular-nums " +
                  (paid ? "text-emerald-300" : "text-brand-cream/40")
                }
              >
                {paid ? "Paid" : "Owes " + money(BUY_IN)}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 text-xs text-rose-300">{error}</div>
      )}
    </section>
  );
}
