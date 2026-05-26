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
          Best 4 of 5 net scores. Lowest total wins.
        </p>
      </header>
      <LeaderboardTable rows={board} rounds={rounds} />
    </div>
  );
}
