import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAll } from "@/lib/data";
import { PlayersEditor } from "./PlayersEditor";

export const dynamic = "force-dynamic";

export default async function PlayersAdminPage() {
  if (!isAdminAuthenticated()) {
    redirect("/admin/login");
  }
  const { players, scores } = await getAll();

  const scoreCountByPlayer = new Map<string, number>();
  for (const s of scores) {
    if (!s.did_not_play && s.gross != null) {
      scoreCountByPlayer.set(
        s.player_id,
        (scoreCountByPlayer.get(s.player_id) ?? 0) + 1,
      );
    }
  }

  return (
    <div className="container-narrow pt-6 pb-16">
      <div className="mb-4">
        <Link
          href="/admin"
          className="text-xs uppercase tracking-widest text-brand-cream/60 hover:text-brand-gold"
        >
          ← Admin
        </Link>
        <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold mt-1">
          Players · Field & Handicaps
        </h1>
        <p className="text-sm text-brand-cream/70 mt-1">
          Swap a golfer, fix a name, edit a handicap, or add a substitute.
          Changing a current index re-derives strokes-received and skins on
          any rounds that player has already entered hole-by-hole.
        </p>
      </div>

      <PlayersEditor
        players={players}
        scoreCountByPlayer={Object.fromEntries(scoreCountByPlayer)}
      />
    </div>
  );
}
