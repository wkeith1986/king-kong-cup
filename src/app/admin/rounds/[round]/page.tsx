import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAll } from "@/lib/data";
import { RoundEntry } from "./RoundEntry";

export const dynamic = "force-dynamic";

export default async function RoundAdminPage({
  params,
}: {
  params: { round: string };
}) {
  if (!isAdminAuthenticated()) {
    redirect("/admin/login");
  }
  const roundNumber = Number(params.round);
  if (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 5) {
    notFound();
  }

  const { players, courses, tees, holes, rounds, scores, holeScores } =
    await getAll();
  const round = rounds.find((r) => r.round_number === roundNumber);
  if (!round) notFound();

  const course = courses.find((c) => c.id === round.course_id) ?? null;
  const courseTees = tees.filter((t) => t.course_id === round.course_id);
  const courseHoles = holes
    .filter((h) => h.course_id === round.course_id)
    .sort((a, b) => a.hole_number - b.hole_number);
  const roundScores = scores.filter((s) => s.round_id === round.id);
  const roundHoleScores = holeScores.filter((h) => h.round_id === round.id);

  return (
    <div className="container-narrow pt-6 pb-16">
      <div className="mb-4 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin"
            className="text-xs uppercase tracking-widest text-brand-cream/60 hover:text-brand-gold"
          >
            ← Admin
          </Link>
          <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold mt-1">
            Round {round.round_number} · Score Entry
          </h1>
          <div className="text-sm text-brand-cream/70 mt-0.5">
            {course?.name ?? "Course TBD"}
          </div>
        </div>
      </div>

      <RoundEntry
        round={round}
        course={course}
        courses={courses}
        tees={courseTees}
        holes={courseHoles}
        players={players}
        existingScores={roundScores}
        existingHoleScores={roundHoleScores}
      />
    </div>
  );
}
