"use client";

import { useState, useTransition } from "react";
import { diagnoseDatabaseAction, seedDatabaseAction } from "./actions";

type Counts = { players: number; courses: number; tees: number; rounds: number };

export function SeedPanel({
  initialCounts,
}: {
  initialCounts: Counts;
}) {
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [diagMessage, setDiagMessage] = useState<string | null>(null);
  const [diagOk, setDiagOk] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [pending, start] = useTransition();

  const isEmpty = counts.rounds === 0 || counts.players === 0;

  const onDiagnose = () =>
    start(async () => {
      setFeedback(null);
      const res = await diagnoseDatabaseAction();
      setDiagOk(res.ok);
      setDiagMessage(res.details);
      setCounts(res.counts);
    });

  const onSeed = () =>
    start(async () => {
      setFeedback(null);
      const res = await seedDatabaseAction();
      if (res.ok) {
        setFeedback({ kind: "ok", msg: res.message });
        const d = await diagnoseDatabaseAction();
        setCounts(d.counts);
      } else {
        setFeedback({ kind: "err", msg: res.message });
      }
    });

  if (!isEmpty && !diagMessage && !feedback) {
    // DB looks healthy — render a compact "Connected" pill.
    return (
      <div className="card p-3 flex items-center justify-between text-xs">
        <span className="text-brand-cream/70">
          <span className="text-emerald-300 font-semibold">● Connected.</span>{" "}
          {counts.players} players · {counts.courses} courses · {counts.rounds} rounds · {counts.tees} tees loaded.
        </span>
        <button
          type="button"
          onClick={onDiagnose}
          disabled={pending}
          className="text-brand-cream/50 hover:text-brand-gold uppercase tracking-widest"
        >
          Re-check
        </button>
      </div>
    );
  }

  return (
    <div className="card border-brand-gold/50 ring-1 ring-brand-gold/30 p-5">
      <h2 className="h-display text-brand-gold text-sm mb-2">
        {isEmpty ? "Database is empty" : "Database diagnostics"}
      </h2>

      {isEmpty && (
        <>
          <p className="text-sm text-brand-cream/85 mb-3">
            The app couldn&rsquo;t find the field, courses, or rounds. This usually
            means one of two things:
          </p>
          <ol className="list-decimal ml-5 space-y-1 text-sm text-brand-cream/80 mb-4">
            <li>
              <strong>Your Supabase database is missing the seed rows.</strong>{" "}
              Click <em>Load Field, Courses &amp; Rounds</em> below. It does
              the same thing as running <code className="text-brand-gold">seed.sql</code> —
              just from here.
            </li>
            <li>
              <strong>Vercel env vars are pointing somewhere else.</strong> Click
              <em> Run Diagnostic</em>; if the error mentions a missing key or
              bad URL, double-check the Supabase variables in Vercel
              Settings → Environment Variables, then redeploy.
            </li>
          </ol>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSeed}
          disabled={pending}
          className="btn-gold"
        >
          {pending ? "Working…" : "Load Field, Courses & Rounds"}
        </button>
        <button
          type="button"
          onClick={onDiagnose}
          disabled={pending}
          className="btn-ghost"
        >
          Run Diagnostic
        </button>
      </div>

      {feedback && (
        <div
          className={
            "mt-4 rounded-md px-4 py-3 text-sm " +
            (feedback.kind === "ok"
              ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
              : "bg-rose-500/15 text-rose-200 border border-rose-500/30")
          }
        >
          {feedback.msg}
        </div>
      )}

      {diagMessage && (
        <div className="mt-3 text-xs text-brand-cream/70">
          <div>
            <span
              className={
                diagOk ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"
              }
            >
              ●
            </span>{" "}
            {diagMessage}
          </div>
          <div className="mt-1">
            Counts → players {counts.players} · courses {counts.courses} · tees {counts.tees} · rounds {counts.rounds}
          </div>
        </div>
      )}
    </div>
  );
}
