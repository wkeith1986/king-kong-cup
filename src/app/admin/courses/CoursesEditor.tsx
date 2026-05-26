"use client";

import { useMemo, useState, useTransition } from "react";
import type { Course, Hole, Tee } from "@/lib/types";
import {
  createTeeAction,
  deleteTeeAction,
  updateTeeAction,
  upsertHolesAction,
} from "../actions";

type Feedback = { kind: "ok" | "err"; msg: string } | null;

export function CoursesEditor({
  courses,
  tees,
  holes,
}: {
  courses: Course[];
  tees: Tee[];
  holes: Hole[];
}) {
  const [activeCourseId, setActiveCourseId] = useState<string>(
    courses[0]?.id ?? "",
  );
  const [feedback, setFeedback] = useState<Feedback>(null);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.name.localeCompare(b.name)),
    [courses],
  );

  return (
    <div className="space-y-6">
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
        <h2 className="h-display text-brand-gold text-sm mb-3">Course</h2>
        <div className="flex flex-wrap gap-2">
          {sortedCourses.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCourseId(c.id)}
              className={
                "px-3 py-1.5 rounded-md text-sm border transition " +
                (activeCourseId === c.id
                  ? "border-brand-gold bg-brand-gold/15 text-brand-cream"
                  : "border-brand-gold/30 text-brand-cream/70 hover:bg-brand-gold/10")
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {activeCourseId && (
        <>
          <TeesEditor
            key={`tees:${activeCourseId}`}
            courseId={activeCourseId}
            tees={tees.filter((t) => t.course_id === activeCourseId)}
            setFeedback={setFeedback}
          />
          <HolesEditor
            key={`holes:${activeCourseId}`}
            courseId={activeCourseId}
            holes={holes
              .filter((h) => h.course_id === activeCourseId)
              .sort((a, b) => a.hole_number - b.hole_number)}
            setFeedback={setFeedback}
          />
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Tees
// ----------------------------------------------------------------------------

function TeesEditor({
  courseId,
  tees,
  setFeedback,
}: {
  courseId: string;
  tees: Tee[];
  setFeedback: (f: Feedback) => void;
}) {
  const [rows, setRows] = useState<Tee[]>(tees);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, start] = useTransition();

  const updateRow = (id: string, patch: Partial<Tee>) =>
    setRows((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const onSaveRow = (t: Tee) =>
    start(async () => {
      setFeedback(null);
      if (!t.name.trim() || !Number.isFinite(t.rating) || !Number.isFinite(t.slope)) {
        setFeedback({ kind: "err", msg: "Tee name, rating, and slope are required." });
        return;
      }
      const res = await updateTeeAction({
        teeId: t.id,
        name: t.name.trim(),
        yardage: t.yardage,
        rating: Number(t.rating),
        slope: Number(t.slope),
      });
      if (res.ok) setFeedback({ kind: "ok", msg: `Saved "${t.name}".` });
      else setFeedback({ kind: "err", msg: res.error });
    });

  const onDeleteRow = (t: Tee) => {
    if (!confirm(`Delete tee "${t.name}"? Any rounds pointed at it will be unlinked.`))
      return;
    start(async () => {
      setFeedback(null);
      const res = await deleteTeeAction({ teeId: t.id });
      if (res.ok) {
        setRows((prev) => prev.filter((x) => x.id !== t.id));
        setFeedback({ kind: "ok", msg: `Deleted "${t.name}".` });
      } else setFeedback({ kind: "err", msg: res.error });
    });
  };

  const onCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const yardageStr = String(fd.get("yardage") ?? "");
    const rating = Number(fd.get("rating"));
    const slope = Number(fd.get("slope"));
    if (!name || !Number.isFinite(rating) || !Number.isFinite(slope)) {
      setFeedback({ kind: "err", msg: "Name, rating, and slope are required." });
      return;
    }
    start(async () => {
      const res = await createTeeAction({
        courseId,
        name,
        yardage: yardageStr ? Number(yardageStr) : null,
        rating,
        slope,
      });
      if (!res.ok) {
        setFeedback({ kind: "err", msg: res.error });
        return;
      }
      setRows((prev) => [
        ...prev,
        {
          id: res.teeId,
          course_id: courseId,
          name,
          yardage: yardageStr ? Number(yardageStr) : null,
          rating,
          slope,
        },
      ]);
      setShowAdd(false);
      setFeedback({ kind: "ok", msg: `Added "${name}".` });
    });
  };

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="h-display text-brand-gold text-sm">Tees</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="btn-ghost text-xs"
        >
          {showAdd ? "Cancel" : "+ New tee"}
        </button>
      </div>

      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-brand-gold/80 border-b border-brand-gold/20">
              <th className="py-2 px-2">Name</th>
              <th className="py-2 px-2 text-right">Yards</th>
              <th className="py-2 px-2 text-right">Rating</th>
              <th className="py-2 px-2 text-right">Slope</th>
              <th className="py-2 px-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-3 px-2 text-brand-cream/50 italic"
                >
                  No tees yet — add one.
                </td>
              </tr>
            )}
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-brand-gold/10 last:border-b-0">
                <td className="py-1.5 px-2">
                  <input
                    className="input w-40"
                    value={t.name}
                    onChange={(e) => updateRow(t.id, { name: e.target.value })}
                  />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input text-right w-24 ml-auto"
                    value={t.yardage ?? ""}
                    onChange={(e) =>
                      updateRow(t.id, {
                        yardage: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    className="input text-right w-20 ml-auto"
                    value={t.rating}
                    onChange={(e) =>
                      updateRow(t.id, { rating: Number(e.target.value) })
                    }
                  />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input text-right w-20 ml-auto"
                    value={t.slope}
                    onChange={(e) =>
                      updateRow(t.id, { slope: Number(e.target.value) })
                    }
                  />
                </td>
                <td className="py-1.5 px-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onSaveRow(t)}
                    disabled={pending}
                    className="text-xs text-brand-gold hover:underline mr-3"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRow(t)}
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
            <input className="input" name="name" placeholder="Blue" required />
          </div>
          <div>
            <label className="label">Yardage</label>
            <input
              className="input"
              type="number"
              name="yardage"
              inputMode="numeric"
              placeholder="6300"
            />
          </div>
          <div>
            <label className="label">Rating</label>
            <input
              className="input"
              type="number"
              step="0.1"
              name="rating"
              inputMode="decimal"
              required
            />
          </div>
          <div>
            <label className="label">Slope</label>
            <input
              className="input"
              type="number"
              name="slope"
              inputMode="numeric"
              required
            />
          </div>
          <div>
            <button type="submit" disabled={pending} className="btn-gold w-full">
              Add tee
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Holes (par + stroke index)
// ----------------------------------------------------------------------------

function HolesEditor({
  courseId,
  holes,
  setFeedback,
}: {
  courseId: string;
  holes: Hole[];
  setFeedback: (f: Feedback) => void;
}) {
  type Row = { hole_number: number; par: number; stroke_index: number };

  const initial: Row[] = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const found = holes.find((h) => h.hole_number === i + 1);
      return {
        hole_number: i + 1,
        par: found?.par ?? 4,
        stroke_index: found?.stroke_index ?? i + 1,
      };
    });
  }, [holes]);

  const [rows, setRows] = useState<Row[]>(initial);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // Validation hint: duplicates and missing stroke indexes.
  const siCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of rows) m.set(r.stroke_index, (m.get(r.stroke_index) ?? 0) + 1);
    return m;
  }, [rows]);
  const hasDuplicateSI = useMemo(
    () => [...siCounts.values()].some((n) => n > 1),
    [siCounts],
  );
  const missingSI = useMemo(() => {
    const present = new Set(rows.map((r) => r.stroke_index));
    return Array.from({ length: 18 }, (_, i) => i + 1).filter((n) => !present.has(n));
  }, [rows]);

  const totalPar = rows.reduce((s, r) => s + (Number(r.par) || 0), 0);

  const onSave = () =>
    start(async () => {
      setFeedback(null);
      if (hasDuplicateSI || missingSI.length > 0) {
        setFeedback({
          kind: "err",
          msg: "Stroke indexes must be a unique 1–18. Fix highlighted cells.",
        });
        return;
      }
      const res = await upsertHolesAction({ courseId, holes: rows });
      if (res.ok)
        setFeedback({
          kind: "ok",
          msg: "Saved. Net-to-par and skins re-derived on any rounds for this course.",
        });
      else setFeedback({ kind: "err", msg: res.error });
    });

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="h-display text-brand-gold text-sm">Holes</h2>
        <div className="text-xs text-brand-cream/60">
          Total par <span className="text-brand-cream tabular-nums">{totalPar}</span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-brand-gold/80 border-b border-brand-gold/20">
              <th className="py-2 px-2">Hole</th>
              <th className="py-2 px-2 text-right">Par</th>
              <th className="py-2 px-2 text-right">Stroke Index</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const dup = (siCounts.get(r.stroke_index) ?? 0) > 1;
              const outOfRange = r.stroke_index < 1 || r.stroke_index > 18;
              const flag = dup || outOfRange;
              return (
                <tr key={i} className="border-b border-brand-gold/10 last:border-b-0">
                  <td className="py-1.5 px-2 text-brand-cream/85 tabular-nums">
                    {r.hole_number}
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={3}
                      max={6}
                      className="input text-right w-16 ml-auto"
                      value={r.par}
                      onChange={(e) =>
                        update(i, { par: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={18}
                      className={
                        "input text-right w-16 ml-auto " +
                        (flag ? "border-rose-400 ring-1 ring-rose-400/40" : "")
                      }
                      value={r.stroke_index}
                      onChange={(e) =>
                        update(i, { stroke_index: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(hasDuplicateSI || missingSI.length > 0) && (
        <div className="text-xs text-rose-300 mt-2">
          {hasDuplicateSI && "Stroke indexes are duplicated. "}
          {missingSI.length > 0 && `Missing SI: ${missingSI.join(", ")}.`}
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="btn-gold"
        >
          {pending ? "Saving…" : "Save Holes"}
        </button>
      </div>
    </section>
  );
}
