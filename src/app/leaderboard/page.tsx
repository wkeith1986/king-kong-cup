import { LeaderboardTable } from "@/components/LeaderboardTable";
import { getAll } from "@/lib/data";
import { computeLeaderboard } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const { players, rounds, scores } = await getAll();

  // Previous-round leaderboard for movement arrows: drop the most recent
  // completed round from the score set.
  const completed = rounds.filter((r) => r.status === "complete");
  const lastCompletedRoundId = completed.length
    ? completed.sort((a, b) => b.round_number - a.round_number)[0].id
    : null;
  const previousScores = lastCompletedRoundId
    ? scores.filter((s) => s.round_id !== lastCompletedRoundId)
    : [];

  const board = computeLeaderboard(players, rounds, scores, previousScores);

  return (
    <div className="container-narrow pt-8 pb-12">
      <header className="mb-6">
        <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold">
          King Kong Cup Standings
        </h1>
        <p className="text-sm text-brand-cream/70 mt-1">
          Best 4 of 5 net scores. Lowest total wins. A DNP-marked round
          counts as that player&rsquo;s automatic drop (max rounds shrinks
          accordingly).
        </p>
        <p className="text-xs text-brand-cream/55 mt-2">
          Standings are ranked by{" "}
          <span className="text-brand-gold/85">projected pace</span> (the{" "}
          <span className="text-brand-cream/85">Proj</span> column), not the
          running total — otherwise a player who has simply played fewer rounds
          would post a lower <span className="text-brand-cream/85">Best 4</span>{" "}
          and falsely sit on top. Once everyone has finished, the projection
          equals the real Best 4, so the final order is the true result.
        </p>
        <p className="text-xs text-brand-cream/55 mt-2">
          <span className="text-brand-gold/85">Proj</span> = projected final
          Best 4, built in three steps: (1) take the net scores already posted,
          (2) pencil in each round not yet played at the player&rsquo;s current
          average net, then (3) run that full set through the same{" "}
          <span className="text-brand-cream/85">Best 4 of 5</span> rule — the
          single worst of the five is dropped. A player with a DNP has fewer
          than 5 rounds, so every round counts and there&rsquo;s nothing extra
          to drop. Because step 2 adds nothing once a player is finished, a
          completed player&rsquo;s <span className="text-brand-cream/85">Proj</span>{" "}
          is exactly their real Best 4. Watch the gap between{" "}
          <span className="text-brand-cream/85">Best 4</span> and{" "}
          <span className="text-brand-cream/85">Proj</span> — that&rsquo;s how
          much room there is for the standings to move.
        </p>
        <p className="text-xs text-brand-cream/55 mt-2">
          <span className="text-brand-gold/85">To Lead</span> = the net average
          a player must hold over their remaining rounds to reach the current
          leader&rsquo;s projected Best 4 (assuming the leader stays on pace).{" "}
          <span className="text-emerald-300/85">ahead</span> means they&rsquo;re
          already projected to be there.
        </p>
      </header>
      <LeaderboardTable rows={board} rounds={rounds} />
    </div>
  );
}
