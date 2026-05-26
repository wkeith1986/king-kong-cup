"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type {
  Course,
  Hole,
  HoleScore,
  Player,
  Round,
  Score,
  Tee,
} from "@/lib/types";
import {
  adjustedGross,
  adjustedNetToPar,
  courseHandicap,
  strokesReceived,
} from "@/lib/scoring";
import { fmtDate, fmtIndex, money, signedNetToPar } from "@/lib/format";
import {
  createTeeAction,
  resetRoundAction,
  saveRoundAction,
  setRoundTeeAction,
  updateRoundMetaAction,
} from "../../actions";

type Props = {
  round: Round;
  course: Course | null;
  courses: Course[];
  tees: Tee[];
  holes: Hole[];
  players: Player[];
  existingScores: Score[];
  existingHoleScores: HoleScore[];
};

export function RoundEntry({
  round,
  course,
  courses,
  tees: initialTees,
  holes,
  players,
  existingScores,
  existingHoleScores,
}: Props) {
  const [tees, setTees] = useState<Tee[]>(initialTees);
  const [teeId, setTeeId] = useState<string | "">(round.tee_id ?? "");
  const [dnpByPlayer, setDnpByPlayer] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      for (const p of players) {
        const existing = existingScores.find((s) => s.player_id === p.id);
        init[p.id] = !!existing?.did_not_play;
      }
      return init;
    },
  );
  // Per-hole GROSS strokes per player. null = blank cell (not entered).
  const [grossByHole, setGrossByHole] = useState<Record<string, (number | null)[]>>(
    () => {
      const init: Record<string, (number | null)[]> = {};
      for (const p of players) {
        init[p.id] = Array.from({ length: 18 }, (_, i) => {
          const h = existingHoleScores.find(
            (x) => x.player_id === p.id && x.hole_number === i + 1,
          );
          return h && h.gross != null ? h.gross : null;
        });
      }
      return init;
    },
  );
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [pending, start] = useTransition();
  const [playedOn, setPlayedOn] = useState<string>(round.played_on ?? "");
  const [courseId, setCourseId] = useState<string>(round.course_id);
  const [showNewTee, setShowNewTee] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const tee = tees.find((t) => t.id === teeId);

  // Course handicap per player for this round (depends only on index + tee slope).
  const chByPlayer = useMemo(() => {
    const m = new Map<string, number>();
    if (!tee) return m;
    for (const p of players) {
      m.set(p.id, courseHandicap(Number(p.current_index), tee.slope));
    }
    return m;
  }, [players, tee]);

  // Strokes-received per (player, hole). Returns a Map<player_id, number[18]>.
  const strokesByHole = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const p of players) {
      const ch = chByPlayer.get(p.id) ?? 0;
      const arr = Array.from({ length: 18 }, (_, i) => {
        const h = holes.find((x) => x.hole_number === i + 1);
        if (!h) return 0;
        return strokesReceived(ch, h.stroke_index);
      });
      m.set(p.id, arr);
    }
    return m;
  }, [players, chByPlayer, holes]);

  // Live per-player totals derived from per-hole grosses. Total/CH/Net use
  // the WHS net-double-bogey cap (so a blow-up hole stops at par+2+pops for
  // scoring purposes). `cappedHoles` is the count of holes that hit the cap,
  // surfaced as a small hint next to the total.
  const summaryByPlayer = useMemo(() => {
    const m = new Map<
      string,
      {
        entered: number;
        rawGross: number;
        adjGross: number;
        cappedHoles: number;
        ch: number | null;
        net: number | null;
      }
    >();
    for (const p of players) {
      const arr = grossByHole[p.id] ?? [];
      const strokesArr = strokesByHole.get(p.id) ?? Array(18).fill(0);
      let entered = 0;
      let rawGross = 0;
      let adjGross = 0;
      let cappedHoles = 0;
      for (let i = 0; i < 18; i++) {
        const v = arr[i];
        if (v == null || !Number.isFinite(v) || v <= 0) continue;
        const hole = holes.find((x) => x.hole_number === i + 1);
        const par = hole?.par ?? 4;
        const s = strokesArr[i] ?? 0;
        const g = Number(v);
        const adj = adjustedGross(g, par, s);
        entered += 1;
        rawGross += g;
        adjGross += adj;
        if (adj < g) cappedHoles += 1;
      }
      const ch = chByPlayer.get(p.id) ?? null;
      const net = entered === 18 && ch != null ? adjGross - ch : null;
      m.set(p.id, { entered, rawGross, adjGross, cappedHoles, ch, net });
    }
    return m;
  }, [players, grossByHole, chByPlayer, holes, strokesByHole]);

  const sortedPlayers = [...players].sort((a, b) => a.sort_order - b.sort_order);

  // ---- auto-save (debounced) ----
  // Skip the first render so we don't auto-save on mount with no changes.
  const firstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const queuedSave = useRef(false);
  // Snapshot of the last persisted payload so we can detect real changes.
  const lastSnapshot = useRef<string>("");

  // Snapshot of all the editable state we want to auto-save on.
  const editableSnapshot = useMemo(
    () => JSON.stringify({ teeId, grossByHole, dnpByPlayer }),
    [teeId, grossByHole, dnpByPlayer],
  );

  const performAutoSave = async () => {
    if (!teeId) return;
    if (inFlight.current) {
      queuedSave.current = true;
      return;
    }
    inFlight.current = true;
    setAutoSaveState("saving");
    const perPlayer = sortedPlayers.map((p) => ({
      playerId: p.id,
      grossByHole: (grossByHole[p.id] ?? Array(18).fill(null)).map((v) =>
        v == null ? null : Number(v),
      ),
      didNotPlay: !!dnpByPlayer[p.id],
    }));
    const res = await saveRoundAction({
      roundId: round.id,
      teeId,
      perPlayer,
    });
    inFlight.current = false;
    if (res.ok) {
      setAutoSaveState("saved");
      setLastSavedAt(new Date());
      lastSnapshot.current = editableSnapshot;
    } else {
      setAutoSaveState("error");
      setFeedback({ kind: "err", msg: res.error });
    }
    // If state changed mid-save, kick another save.
    if (queuedSave.current) {
      queuedSave.current = false;
      // Re-arm the debounce so rapid typing doesn't hammer the server.
      setAutoSaveState("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(performAutoSave, 1200);
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      lastSnapshot.current = editableSnapshot;
      return;
    }
    if (!teeId) return;
    if (editableSnapshot === lastSnapshot.current) return;
    setAutoSaveState("dirty");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(performAutoSave, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableSnapshot, teeId]);

  // ---- handlers ----
  const onSaveMeta = () =>
    start(async () => {
      setFeedback(null);
      const res = await updateRoundMetaAction({
        roundId: round.id,
        playedOn: playedOn || null,
        courseId,
      });
      if (res.ok)
        setFeedback({ kind: "ok", msg: "Round details saved." });
      else setFeedback({ kind: "err", msg: res.error });
    });

  const onCreateTee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    start(async () => {
      setFeedback(null);
      const name = String(form.get("name") ?? "").trim();
      const yardageStr = String(form.get("yardage") ?? "");
      const rating = Number(form.get("rating"));
      const slope = Number(form.get("slope"));
      if (!name || !Number.isFinite(rating) || !Number.isFinite(slope)) {
        setFeedback({ kind: "err", msg: "Name, rating, and slope are required." });
        return;
      }
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
      // Optimistically add the tee locally so the dropdown updates without reload.
      const newTee: Tee = {
        id: res.teeId,
        course_id: courseId,
        name,
        yardage: yardageStr ? Number(yardageStr) : null,
        rating,
        slope,
      };
      setTees((prev) => [...prev, newTee]);
      setTeeId(res.teeId);
      setShowNewTee(false);
      // Link the round to the new tee.
      await setRoundTeeAction({ roundId: round.id, teeId: res.teeId });
      setFeedback({ kind: "ok", msg: `Added tee "${name}".` });
    });
  };

  const onSave = () =>
    start(async () => {
      setFeedback(null);
      if (!teeId) {
        setFeedback({ kind: "err", msg: "Pick a tee first — CH and pops depend on it." });
        return;
      }
      const perPlayer = sortedPlayers.map((p) => ({
        playerId: p.id,
        grossByHole: (grossByHole[p.id] ?? Array(18).fill(null)).map((v) =>
          v == null ? null : Number(v),
        ),
        didNotPlay: !!dnpByPlayer[p.id],
      }));
      const res = await saveRoundAction({
        roundId: round.id,
        teeId,
        perPlayer,
      });
      if (res.ok)
        setFeedback({
          kind: "ok",
          msg: "Saved. Leaderboard and skins updated.",
        });
      else setFeedback({ kind: "err", msg: res.error });
    });

  const onReset = () => {
    if (
      !confirm(
        `Clear all scores and skins for Round ${round.round_number}? This cannot be undone.`,
      )
    )
      return;
    start(async () => {
      const res = await resetRoundAction({ roundId: round.id });
      if (res.ok)
        setFeedback({ kind: "ok", msg: "Round reset." });
      else setFeedback({ kind: "err", msg: res.error });
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback */}
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

      {/* 1. Round meta + tee */}
      <section className="card p-5">
        <h2 className="h-display text-brand-gold text-sm mb-4">1. Course & Tee</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="label">Course</label>
            <select
              className="input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Played on</label>
            <input
              type="date"
              value={playedOn}
              onChange={(e) => setPlayedOn(e.target.value)}
              className="input"
            />
            <div className="text-xs text-brand-cream/50 mt-1">
              {playedOn ? fmtDate(playedOn) : "—"}
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={onSaveMeta}
              disabled={pending}
              className="btn-ghost w-full"
            >
              Save Course & Date
            </button>
          </div>
        </div>

        <div className="gold-rule my-4" />

        <div className="grid grid-cols-1 sm:grid-cols-[2fr_auto] gap-3 items-end">
          <div>
            <label className="label">Tee</label>
            <select
              className="input"
              value={teeId}
              onChange={(e) => {
                setTeeId(e.target.value);
                if (e.target.value) {
                  start(async () => {
                    await setRoundTeeAction({
                      roundId: round.id,
                      teeId: e.target.value,
                    });
                  });
                }
              }}
            >
              <option value="">— Select tee —</option>
              {tees.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · Rating {t.rating} / Slope {t.slope}
                  {t.yardage ? ` · ${t.yardage} yds` : ""}
                </option>
              ))}
            </select>
            {tee && (
              <div className="text-xs text-brand-cream/60 mt-1">
                Rating <span className="text-brand-cream">{tee.rating}</span>
                {" · "}Slope <span className="text-brand-cream">{tee.slope}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowNewTee((v) => !v)}
            className="btn-ghost"
          >
            {showNewTee ? "Cancel" : "+ New tee"}
          </button>
        </div>

        {showNewTee && (
          <form
            className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end border-t border-brand-gold/20 pt-4"
            onSubmit={onCreateTee}
          >
            <div>
              <label className="label">Tee name</label>
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
            <div className="col-span-2 md:col-span-4">
              <button type="submit" disabled={pending} className="btn-gold">
                Add tee
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 2. Scores — per-hole gross is the only input; total/CH/net derive. */}
      <section className="card p-5">
        <h2 className="h-display text-brand-gold text-sm mb-1">
          2. Scores
        </h2>
        <p className="text-xs text-brand-cream/60 mb-4">
          Enter each player&rsquo;s GROSS strokes hole-by-hole. The dot under
          each cell shows handicap strokes received on that hole (1 = ●, 2 = ●●).
          Total / CH / Net fill in once all 18 holes are entered. A skin goes
          to the sole lowest net-to-par ≤ 0 on a hole.{" "}
          <span className="text-brand-cream/50">
            Each hole is capped at net double bogey (par + 2 + pops) for
            scoring purposes — type the actual gross they shot; the cap is
            applied automatically.
          </span>
          {!tee && (
            <span className="text-rose-300 ml-1">
              Pick a tee first.
            </span>
          )}
          {holes.length !== 18 && (
            <span className="text-rose-300 ml-1">
              Course is missing hole data — add par + SI in Admin → Courses.
            </span>
          )}
        </p>

        <div className="overflow-x-auto scroll-x-touch -mx-5 px-5 sm:mx-0 sm:px-0">
          <table className="text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-brand-gold/80">
                <th className="sticky left-0 bg-brand-warm text-left px-2 py-2 z-10 border-r border-b border-brand-gold/30">
                  Player
                </th>
                <th
                  className="px-2 py-2 text-center border-b border-brand-gold/30"
                  title="Did Not Play — forces this round to be the player's drop"
                >
                  DNP
                </th>
                {Array.from({ length: 18 }, (_, i) => (
                  <th
                    key={i}
                    className="px-0.5 py-2 text-center font-semibold border-b border-brand-gold/30"
                    style={{ minWidth: 52 }}
                  >
                    {i + 1}
                  </th>
                ))}
                <th className="px-2 py-2 text-right border-b border-brand-gold/30">
                  Total
                </th>
                <th className="px-2 py-2 text-right border-b border-brand-gold/30">
                  CH
                </th>
                <th className="px-2 py-2 text-right border-b border-brand-gold/30">
                  Net
                </th>
              </tr>
              <tr className="text-brand-cream/60 text-[10px] uppercase tracking-wider">
                <th className="sticky left-0 bg-brand-warm text-left px-2 py-1 z-10 border-r border-b border-brand-gold/20">
                  Par · SI
                </th>
                <th className="px-2 py-1 border-b border-brand-gold/20" />
                {Array.from({ length: 18 }, (_, i) => {
                  const h = holes.find((x) => x.hole_number === i + 1);
                  return (
                    <th
                      key={i}
                      className="px-0.5 py-1 text-center border-b border-brand-gold/20"
                    >
                      <div className="text-brand-cream/85 tabular-nums">
                        {h ? h.par : "—"}
                      </div>
                      <div className="text-brand-gold/60 tabular-nums">
                        {h ? h.stroke_index : "—"}
                      </div>
                    </th>
                  );
                })}
                <th className="px-2 py-1 border-b border-brand-gold/20" />
                <th className="px-2 py-1 border-b border-brand-gold/20" />
                <th className="px-2 py-1 border-b border-brand-gold/20" />
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p) => {
                const dnp = !!dnpByPlayer[p.id];
                const arr = grossByHole[p.id] ?? Array(18).fill(null);
                const strokesArr = strokesByHole.get(p.id) ?? Array(18).fill(0);
                const summary = summaryByPlayer.get(p.id);
                return (
                  <tr
                    key={p.id}
                    className={dnp ? "opacity-50" : ""}
                  >
                    <td className="sticky left-0 bg-brand-warm/95 px-2 py-1 z-10 border-r border-b border-brand-gold/20 whitespace-nowrap text-sm">
                      <div>{p.name}</div>
                      <div className="text-[10px] text-brand-cream/50">
                        Idx {fmtIndex(p.current_index)}
                        {chByPlayer.get(p.id) != null && (
                          <> · CH {chByPlayer.get(p.id)}</>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1 text-center border-b border-brand-gold/10">
                      <input
                        type="checkbox"
                        checked={dnp}
                        onChange={(e) =>
                          setDnpByPlayer((prev) => ({
                            ...prev,
                            [p.id]: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-brand-gold"
                      />
                    </td>
                    {arr.map((v, i) => {
                      const s = strokesArr[i] ?? 0;
                      return (
                        <td
                          key={i}
                          className="px-0.5 py-1 border-b border-brand-gold/10 text-center"
                        >
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            disabled={dnp}
                            className="w-12 h-11 rounded-md border border-brand-gold/30 bg-brand-dark/70 text-center text-brand-cream focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold disabled:opacity-50"
                            value={dnp ? "" : v == null ? "" : String(v)}
                            onChange={(e) => {
                              const next = [...arr];
                              const raw = e.target.value;
                              if (raw === "") {
                                next[i] = null;
                              } else {
                                const n = Number(raw);
                                next[i] =
                                  Number.isFinite(n) && n > 0
                                    ? Math.trunc(n)
                                    : null;
                              }
                              setGrossByHole((prev) => ({
                                ...prev,
                                [p.id]: next,
                              }));
                            }}
                          />
                          <div className="text-[10px] text-brand-gold/70 leading-tight h-3">
                            {s > 0 ? "●".repeat(Math.min(s, 3)) : ""}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-right tabular-nums border-b border-brand-gold/10">
                      {dnp ? (
                        <span className="text-brand-cream/40 italic">DNP</span>
                      ) : summary && summary.entered > 0 ? (
                        <span
                          className={
                            summary.entered === 18
                              ? "font-semibold text-brand-cream"
                              : "text-brand-cream/60 italic"
                          }
                          title={
                            summary.cappedHoles > 0
                              ? `Raw gross ${summary.rawGross}; ${summary.cappedHoles} hole${summary.cappedHoles === 1 ? "" : "s"} capped at net double bogey`
                              : summary.entered === 18
                                ? "Complete"
                                : `${summary.entered}/18 holes entered`
                          }
                        >
                          {summary.adjGross}
                          {summary.cappedHoles > 0 && (
                            <span className="text-[9px] text-brand-gold/80 ml-1">
                              (raw {summary.rawGross})
                            </span>
                          )}
                          {summary.entered < 18 && (
                            <span className="text-[9px] ml-1">
                              ({summary.entered}/18)
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-brand-cream/70 border-b border-brand-gold/10">
                      {dnp ? "—" : (chByPlayer.get(p.id) ?? "—")}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums font-semibold border-b border-brand-gold/10">
                      {dnp ? (
                        "—"
                      ) : summary && summary.net != null ? (
                        summary.net
                      ) : (
                        <span className="text-brand-cream/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-brand-cream/50 mt-3">
          Swipe the table sideways to reach holes 10&ndash;18 on mobile.
          Leave a cell blank if a player didn&rsquo;t play that hole — it
          won&rsquo;t count toward skins, and the round won&rsquo;t roll up
          for the leaderboard until all 18 holes are in.
        </p>

        <div className="mt-4 flex flex-wrap gap-3 justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="btn-gold"
            >
              {pending ? "Saving…" : "Save Round"}
            </button>
            <AutoSaveBadge state={autoSaveState} lastSavedAt={lastSavedAt} />
          </div>
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className="text-xs text-rose-300 hover:underline"
          >
            Reset round (delete all entries)
          </button>
        </div>
      </section>

      <SkinsPreview
        grossByHole={grossByHole}
        strokesByHole={strokesByHole}
        holes={holes}
        players={sortedPlayers}
      />
    </div>
  );
}

function SkinsPreview({
  grossByHole,
  strokesByHole,
  holes,
  players,
}: {
  grossByHole: Record<string, (number | null)[]>;
  strokesByHole: Map<string, number[]>;
  holes: Hole[];
  players: Player[];
}) {
  // Compute net-to-par per hole from gross, then run skins logic locally.
  const preview = useMemo(() => {
    const skins: Array<{
      hole: number;
      winnerId: string;
      net: number;
    }> = [];
    for (let h = 1; h <= 18; h++) {
      const hole = holes.find((x) => x.hole_number === h);
      if (!hole) continue;
      const entries = players
        .map((p) => {
          const gross = grossByHole[p.id]?.[h - 1];
          if (gross == null) return null;
          const s = strokesByHole.get(p.id)?.[h - 1] ?? 0;
          return { id: p.id, v: adjustedNetToPar(gross, hole.par, s) };
        })
        .filter((e): e is { id: string; v: number } => e != null);
      if (entries.length === 0) continue;
      const min = Math.min(...entries.map((e) => e.v));
      if (min > 0) continue;
      const winners = entries.filter((e) => e.v === min);
      if (winners.length !== 1) continue;
      skins.push({ hole: h, winnerId: winners[0].id, net: min });
    }
    const value = skins.length ? 300 / skins.length : 0;
    return { skins, value };
  }, [grossByHole, strokesByHole, holes, players]);

  const nameById = new Map(players.map((p) => [p.id, p.name]));

  return (
    <section className="card p-5">
      <h2 className="h-display text-brand-gold text-sm mb-3">
        Skins Preview
      </h2>
      <p className="text-xs text-brand-cream/60 mb-3">
        Live preview before you click &ldquo;Save Hole Scores&rdquo;. Carry-in
        from previous rounds is added on save.
      </p>

      {preview.skins.length === 0 ? (
        <div className="text-sm font-serif italic text-brand-cream/60">
          No skins with current entries. (Pot would carry forward.)
        </div>
      ) : (
        <ul className="space-y-1 text-sm">
          {preview.skins.map((s) => (
            <li
              key={s.hole}
              className="flex justify-between py-1 border-b border-brand-gold/10 last:border-b-0"
            >
              <span>
                Hole {s.hole} &middot;{" "}
                <span className="text-brand-gold">{signedNetToPar(s.net)}</span>{" "}
                — {nameById.get(s.winnerId)}
              </span>
              <span className="tabular-nums text-brand-gold">
                {money(preview.value)} (base $300)
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AutoSaveBadge({
  state,
  lastSavedAt,
}: {
  state: "idle" | "dirty" | "saving" | "saved" | "error";
  lastSavedAt: Date | null;
}) {
  // Tick every 20s so the "saved X ago" label updates without a re-render
  // anywhere else.
  const [, force] = useState(0);
  useEffect(() => {
    if (state !== "saved") return;
    const id = setInterval(() => force((n) => n + 1), 20000);
    return () => clearInterval(id);
  }, [state]);

  if (state === "idle") return null;

  let dot = "bg-brand-cream/40";
  let label = "";
  if (state === "dirty") {
    dot = "bg-amber-400";
    label = "Unsaved changes…";
  } else if (state === "saving") {
    dot = "bg-amber-400 animate-pulse";
    label = "Auto-saving…";
  } else if (state === "saved") {
    dot = "bg-emerald-400";
    const ago = lastSavedAt
      ? Math.max(0, Math.round((Date.now() - lastSavedAt.getTime()) / 1000))
      : 0;
    label =
      ago < 5
        ? "Saved"
        : ago < 60
          ? `Saved ${ago}s ago`
          : `Saved ${Math.round(ago / 60)}m ago`;
  } else if (state === "error") {
    dot = "bg-rose-400";
    label = "Auto-save failed — try Save Round";
  }

  return (
    <span className="text-xs text-brand-cream/70 flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
