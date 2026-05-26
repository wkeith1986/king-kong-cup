"use client";

import { useState, useTransition } from "react";
import type { Player } from "@/lib/types";
import {
  createPlayerAction,
  deletePlayerAction,
  updatePlayerAction,
} from "../actions";

type Feedback = { kind: "ok" | "err"; msg: string } | null;

type EditableRow = {
  id: string;
  name: string;
  ghin: string;
  starting_index: string;
  current_index: string;
  sort_order: number;
  scoreCount: number;
};

function toRow(p: Player, scoreCount: number): EditableRow {
  return {
    id: p.id,
    name: p.name,
    ghin: p.ghin ?? "",
    starting_index: String(p.starting_index),
    current_index: String(p.current_index),
    sort_order: p.sort_order,
    scoreCount,
  };
}

export function PlayersEditor({
  players,
  scoreCountByPlayer,
}: {
  players: Player[];
  scoreCountByPlayer: Record<string, number>;
}) {
  const [rows, setRows] = useState<EditableRow[]>(() =>
    [...players]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => toRow(p, scoreCountByPlayer[p.id] ?? 0)),
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, start] = useTransition();

  const update = (id: string, patch: Partial<EditableRow>) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );

  const onSave = (r: EditableRow) =>
    start(async () => {
      setFeedback(null);
      const startingIndex = Number(r.starting_index);
      const currentIndex = Number(r.current_index);
      if (
        !r.name.trim() ||
        !Number.isFinite(startingIndex) ||
        !Number.isFinite(currentIndex)
      ) {
        setFeedback({
          kind: "err",
          msg: "Name, starting index, and current index are required.",
        });
        return;
      }
      const res = await updatePlayerAction({
        playerId: r.id,
        name: r.name.trim(),
        ghin: r.ghin.trim() || null,
        startingIndex,
        currentIndex,
        sortOrder: r.sort_order,
      });
      if (res.ok) setFeedback({ kind: "ok", msg: `Saved ${r.name.trim()}.` });
      else setFeedback({ kind: "err", msg: res.error });
    });

  const onDelete = (r: EditableRow) => {
    const warning =
      r.scoreCount > 0
        ? `${r.name} has ${r.scoreCount} round${r.scoreCount === 1 ? "" : "s"} scored. Deleting will also remove those scores. Continue?`
        : `Delete ${r.name} from the field?`;
    if (!confirm(warning)) return;
    start(async () => {
      setFeedback(null);
      const res = await deletePlayerAction({ playerId: r.id });
      if (res.ok) {
        setRows((prev) => prev.filter((x) => x.id !== r.id));
        setFeedback({ kind: "ok", msg: `Removed ${r.name}.` });
      } else setFeedback({ kind: "err", msg: res.error });
    });
  };

  const onCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const ghin = String(fd.get("ghin") ?? "").trim();
    const startingIndex = Number(fd.get("starting_index"));
    const currentIndex = Number(fd.get("current_index") ?? startingIndex);
    if (!name || !Number.isFinite(startingIndex)) {
      setFeedback({
        kind: "err",
        msg: "Name and starting index are required.",
      });
      return;
    }
    start(async () => {
      const res = await createPlayerAction({
        name,
        ghin: ghin || null,
        startingIndex,
        currentIndex: Number.isFinite(currentIndex) ? currentIndex : startingIndex,
      });
      if (!res.ok) {
        setFeedback({ kind: "err", msg: res.error });
        return;
      }
      setRows((prev) => [
        ...prev,
        {
          id: res.playerId,
          name,
          ghin,
          starting_index: String(startingIndex),
          current_index: String(
            Number.isFinite(currentIndex) ? currentIndex : startingIndex,
          ),
          sort_order: prev.length
            ? Math.max(...prev.map((p) => p.sort_order)) + 1
            : 1,
          scoreCount: 0,
        },
      ]);
      setShowAdd(false);
      setFeedback({ kind: "ok", msg: `Added ${name}.` });
      (e.target as HTMLFormElement).reset();
    });
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={
            "rounded-md px-4 py-3 text-sm " +
            (feedback.kind === "ok"
              ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
              : "bg-rose-500/15 text-rose-200 border border-rose-500/30")
          }
        >
          {feedback.msg}
        </div>
      )}

      <section className="card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="h-display text-brand-gold text-sm">
            Field ({rows.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="btn-ghost text-xs"
          >
            {showAdd ? "Cancel" : "+ Add player"}
          </button>
        </div>

        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-brand-gold/80 border-b border-brand-gold/20">
                <th className="py-2 px-2">Order</th>
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2 text-right">GHIN</th>
                <th className="py-2 px-2 text-right">Start Idx</th>
                <th className="py-2 px-2 text-right">Current Idx</th>
                <th className="py-2 px-2 text-right">Scored</th>
                <th className="py-2 px-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-brand-gold/10 last:border-b-0"
                >
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      className="input text-center w-16"
                      value={r.sort_order}
                      onChange={(e) =>
                        update(r.id, { sort_order: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      className="input w-44"
                      value={r.name}
                      onChange={(e) => update(r.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <input
                      className="input text-right w-28 ml-auto"
                      value={r.ghin}
                      placeholder="—"
                      onChange={(e) => update(r.id, { ghin: e.target.value })}
                    />
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      className="input text-right w-20 ml-auto"
                      value={r.starting_index}
                      onChange={(e) =>
                        update(r.id, { starting_index: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      className="input text-right w-20 ml-auto"
                      value={r.current_index}
                      onChange={(e) =>
                        update(r.id, { current_index: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-brand-cream/60">
                    {r.scoreCount}
                  </td>
                  <td className="py-1.5 px-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSave(r)}
                      disabled={pending}
                      className="text-xs text-brand-gold hover:underline mr-3"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(r)}
                      disabled={pending}
                      className="text-xs text-rose-300 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showAdd && (
          <form
            className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end border-t border-brand-gold/20 pt-4"
            onSubmit={onCreate}
          >
            <div>
              <label className="label">Name</label>
              <input className="input" name="name" required />
            </div>
            <div>
              <label className="label">GHIN</label>
              <input className="input" name="ghin" />
            </div>
            <div>
              <label className="label">Starting Index</label>
              <input
                className="input"
                type="number"
                step="0.1"
                inputMode="decimal"
                name="starting_index"
                required
              />
            </div>
            <div>
              <label className="label">Current Index</label>
              <input
                className="input"
                type="number"
                step="0.1"
                inputMode="decimal"
                name="current_index"
                placeholder="defaults to starting"
              />
            </div>
            <div>
              <button type="submit" disabled={pending} className="btn-gold w-full">
                Add player
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="text-xs text-brand-cream/50 px-1">
        <strong className="text-brand-cream/80">Swapping someone out?</strong>{" "}
        Edit the existing row — change the name and index to the substitute,
        save, and you&rsquo;re done. Existing rounds for that slot stay
        attached. If a player is truly out and their rounds shouldn&rsquo;t
        count for anyone, delete the player (this also deletes their scores).
      </div>
    </div>
  );
}
