"use client";

import { useMemo, useState } from "react";
import type { LeaderboardRow, Round } from "@/lib/types";
import { fmtIndex, ordinal } from "@/lib/format";

type SortKey = "position" | "name" | "index";

export function LeaderboardTable({
  rows,
  rounds,
  showAdjustedIndex = true,
}: {
  rows: LeaderboardRow[];
  rounds: Round[];
  showAdjustedIndex?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("position");

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sort === "name")
      copy.sort((a, b) => a.player.name.localeCompare(b.player.name));
    else if (sort === "index")
      copy.sort((a, b) => a.player.current_index - b.player.current_index);
    else copy.sort((a, b) => a.position - b.position);
    return copy;
  }, [rows, sort]);

  const completedRounds = rounds.filter((r) => r.status === "complete").length;
  const roundsList = [...rounds].sort((a, b) => a.round_number - b.round_number);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="text-sm text-brand-cream/70">
          <span className="text-brand-gold font-semibold">
            {completedRounds}
          </span>{" "}
          of {rounds.length} rounds complete
        </div>
        <div className="flex gap-2 text-xs">
          <span className="text-brand-cream/60 self-center mr-1">Sort:</span>
          {(["position", "name", "index"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={
                "px-2.5 py-1 rounded-md uppercase tracking-wider transition border " +
                (sort === k
                  ? "bg-brand-gold text-brand-dark border-brand-gold"
                  : "border-brand-gold/30 text-brand-cream/80 hover:bg-brand-gold/10")
              }
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((row) => (
          <MobileCard
            key={row.player.id}
            row={row}
            rounds={roundsList}
            showAdjustedIndex={showAdjustedIndex}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-brand-gold/80 border-b border-brand-gold/20 bg-brand-dark/40">
                <th className="px-3 py-3">Pos</th>
                <th className="px-3 py-3">Player</th>
                <th className="px-3 py-3">Idx</th>
                {roundsList.map((r) => (
                  <th key={r.id} className="px-2 py-3 text-center">
                    R{r.round_number}
                    <div className="text-[10px] text-brand-cream/50 font-normal normal-case tracking-normal">
                      G / Net
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Total Net</th>
                <th className="px-3 py-3 text-right">Best 4</th>
                <th className="px-3 py-3 text-center">±</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const isLeader = row.position === 1 && row.bestFourNet != null;
                return (
                  <tr
                    key={row.player.id}
                    className={
                      "border-b border-brand-gold/10 last:border-b-0 " +
                      (isLeader
                        ? "bg-brand-gold/15"
                        : idx % 2 === 0
                          ? "bg-brand-dark/20"
                          : "")
                    }
                  >
                    <td className="px-3 py-3 font-bold text-brand-gold tabular-nums">
                      {row.bestFourNet != null
                        ? (row.isTied ? `T${row.position}` : row.position)
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold">{row.player.name}</div>
                    </td>
                    <td className="px-3 py-3 text-brand-cream/85">
                      {fmtIndex(row.player.current_index)}
                      {showAdjustedIndex &&
                        row.player.current_index !==
                          row.player.starting_index && (
                          <span className="text-xs text-brand-cream/50 ml-1">
                            ({fmtIndex(row.player.starting_index)})
                          </span>
                        )}
                    </td>
                    {row.perRound.map((pr) => (
                      <td
                        key={pr.round_number}
                        className={
                          "px-2 py-3 text-center " +
                          (pr.isDNP
                            ? "opacity-60"
                            : pr.isDrop
                              ? "opacity-50 line-through"
                              : "")
                        }
                      >
                        {pr.isDNP ? (
                          <div className="text-xs italic text-brand-cream/60">
                            DNP
                            <div className="text-[9px] uppercase tracking-widest text-brand-gold/60 not-italic">
                              drop
                            </div>
                          </div>
                        ) : pr.played ? (
                          <div>
                            <div className="text-brand-cream/70 text-xs">
                              {pr.gross}
                            </div>
                            <div className="font-semibold">{pr.net}</div>
                          </div>
                        ) : (
                          <span className="text-brand-cream/30">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right text-brand-cream/85">
                      {row.totalNet ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-bold">
                      {row.bestFourNet ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Movement value={row.movement} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MobileCard({
  row,
  rounds,
  showAdjustedIndex,
}: {
  row: LeaderboardRow;
  rounds: Round[];
  showAdjustedIndex: boolean;
}) {
  const isLeader = row.position === 1 && row.bestFourNet != null;
  return (
    <div
      className={
        "card p-4 " + (isLeader ? "ring-2 ring-brand-gold bg-brand-gold/10" : "")
      }
    >
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <div className="text-2xl font-bold text-brand-gold tabular-nums">
            {row.bestFourNet != null
              ? (row.isTied ? `T${row.position}` : ordinal(row.position))
              : "—"}
          </div>
          <div>
            <div className="font-semibold leading-tight">{row.player.name}</div>
            <div className="text-xs text-brand-cream/60 mt-0.5">
              Index {fmtIndex(row.player.current_index)}
              {showAdjustedIndex &&
                row.player.current_index !== row.player.starting_index && (
                  <span className="ml-1">
                    (was {fmtIndex(row.player.starting_index)})
                  </span>
                )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-brand-cream/50">
            Best 4
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {row.bestFourNet ?? "—"}
          </div>
          <Movement value={row.movement} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5 text-center text-xs">
        {row.perRound.map((pr) => (
          <div
            key={pr.round_number}
            className={
              "rounded-md py-1.5 px-1 border " +
              (pr.isDNP
                ? "opacity-60 border-brand-gold/10"
                : pr.isDrop
                  ? "opacity-50 border-brand-gold/10 line-through"
                  : "border-brand-gold/20 bg-brand-dark/30")
            }
          >
            <div className="text-[10px] text-brand-cream/50">
              R{pr.round_number}
            </div>
            {pr.isDNP ? (
              <div className="text-[10px] italic text-brand-cream/60">DNP</div>
            ) : pr.played ? (
              <>
                <div className="text-brand-cream/70 text-[10px]">
                  {pr.gross}
                </div>
                <div className="font-semibold">{pr.net}</div>
              </>
            ) : (
              <div className="text-brand-cream/30">—</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Movement({ value }: { value: number }) {
  if (value === 0) return <span className="text-brand-cream/40 text-xs">—</span>;
  if (value > 0)
    return (
      <span className="text-emerald-300 text-xs font-semibold">▲ {value}</span>
    );
  return (
    <span className="text-rose-300 text-xs font-semibold">▼ {Math.abs(value)}</span>
  );
}
