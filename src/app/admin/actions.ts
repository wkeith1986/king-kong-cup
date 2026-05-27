"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  isAdminAuthenticated,
  setAdminSession,
  verifyPassword,
} from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import {
  adjustedGross,
  adjustedNetToPar,
  buildScoreRow,
  courseHandicap,
  strokesReceived,
} from "@/lib/scoring";
import { computeSkins } from "@/lib/skins";
import {
  computeHandicapAdjustment,
} from "@/lib/handicap";
import type { Hole, Player, Round, Score, Tee } from "@/lib/types";

function requireAdmin() {
  if (!isAdminAuthenticated()) {
    redirect("/admin/login");
  }
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/daily");
  revalidatePath("/pairings");
  revalidatePath("/skins");
  revalidatePath("/bonus");
  revalidatePath("/info");
  revalidatePath("/admin");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/players");
  revalidatePath("/admin/rounds", "layout");
}

// ============================================================================
// DIAGNOSTICS & SEEDING
// ============================================================================

/** Quick connection check + row counts, surfaced on /admin when DB looks empty. */
export async function diagnoseDatabaseAction(): Promise<{
  ok: boolean;
  details: string;
  counts: {
    players: number;
    courses: number;
    tees: number;
    rounds: number;
  };
}> {
  requireAdmin();
  try {
    const sb = getServiceClient();
    const [{ count: p, error: pe }, { count: c, error: ce }, { count: t, error: te }, { count: r, error: re }] =
      await Promise.all([
        sb.from("players").select("*", { count: "exact", head: true }),
        sb.from("courses").select("*", { count: "exact", head: true }),
        sb.from("tees").select("*", { count: "exact", head: true }),
        sb.from("rounds").select("*", { count: "exact", head: true }),
      ]);
    const firstError = pe ?? ce ?? te ?? re;
    if (firstError) {
      return {
        ok: false,
        details: `Supabase error: ${firstError.message}`,
        counts: { players: 0, courses: 0, tees: 0, rounds: 0 },
      };
    }
    return {
      ok: true,
      details: "Connected.",
      counts: {
        players: p ?? 0,
        courses: c ?? 0,
        tees: t ?? 0,
        rounds: r ?? 0,
      },
    };
  } catch (err) {
    return {
      ok: false,
      details: (err as Error).message,
      counts: { players: 0, courses: 0, tees: 0, rounds: 0 },
    };
  }
}

/**
 * Insert (or upsert) the 12 players, 4 courses, Wolf Creek tees, 5 rounds,
 * and one skin_pots row per round. Idempotent — safe to click multiple times.
 *
 * This is the same data as supabase/seed.sql, runnable from the admin UI.
 */
export async function seedDatabaseAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  requireAdmin();
  try {
    const sb = getServiceClient();

    const players = [
      { name: "Andrew Robb", starting_index: 1.9, current_index: 1.9, ghin: "998865", sort_order: 1 },
      { name: "Kip Robertson", starting_index: 2.5, current_index: 2.5, ghin: "6087170", sort_order: 2 },
      { name: "Marc Hoffmann", starting_index: 6.8, current_index: 6.8, ghin: "10646917", sort_order: 3 },
      { name: "Bill Day", starting_index: 8.0, current_index: 8.0, ghin: "2619855", sort_order: 4 },
      { name: "Dave Cash", starting_index: 8.2, current_index: 8.2, ghin: "51511", sort_order: 5 },
      { name: "Jarrod Robson", starting_index: 11.4, current_index: 11.4, ghin: "732201", sort_order: 6 },
      { name: "Tae Kong", starting_index: 12.3, current_index: 12.3, ghin: "1902696", sort_order: 7 },
      { name: "Rob Downey", starting_index: 12.6, current_index: 12.6, ghin: "1331159", sort_order: 8 },
      { name: "Brandt Wible", starting_index: 16.0, current_index: 16.0, ghin: "2316198", sort_order: 9 },
      { name: "John Glade", starting_index: 8.0, current_index: 8.0, ghin: null, sort_order: 10 },
      { name: "Bill Keith", starting_index: 21.0, current_index: 21.0, ghin: "2183718", sort_order: 11 },
      { name: "Eric Gottman", starting_index: 22.0, current_index: 22.0, ghin: null, sort_order: 12 },
    ];

    const { error: pErr } = await sb
      .from("players")
      .upsert(players, { onConflict: "name", ignoreDuplicates: true });
    if (pErr) throw pErr;

    const courses = [
      { name: "Wolf Creek Golf Club", location: "Mesquite, NV", par: 72 },
      { name: "Sand Hollow Resort", location: "Hurricane, UT", par: 72 },
      { name: "Copper Rock Golf Course", location: "Hurricane, UT", par: 72 },
      { name: "Black Desert Resort", location: "Ivins, UT", par: 72 },
    ];
    const { error: cErr } = await sb
      .from("courses")
      .upsert(courses, { onConflict: "name", ignoreDuplicates: true });
    if (cErr) throw cErr;

    // Tees + holes per course. Numbers are the latest canonical scorecard
    // values; tweak any of them in Admin → Courses if a course re-rates
    // between now and game day.
    type SeedTee = { name: string; yardage: number | null; rating: number; slope: number };
    type SeedHole = { hole_number: number; par: number; stroke_index: number };
    type SeedCourse = { courseName: string; tees: SeedTee[]; holes: SeedHole[] };

    const courseSeeds: SeedCourse[] = [
      {
        courseName: "Wolf Creek Golf Club",
        tees: [
          { name: "Challenger", yardage: 6939, rating: 74.8, slope: 149 },
          { name: "Champions",  yardage: 6309, rating: 71.8, slope: 144 },
          { name: "Masters",    yardage: 5798, rating: 68.8, slope: 137 },
          { name: "Signature",  yardage: 5064, rating: 66.1, slope: 117 },
          { name: "Classics",   yardage: 4101, rating: 62.8, slope: 114 },
        ],
        holes: [
          { hole_number: 1,  par: 5, stroke_index: 9 },
          { hole_number: 2,  par: 4, stroke_index: 1 },
          { hole_number: 3,  par: 3, stroke_index: 7 },
          { hole_number: 4,  par: 4, stroke_index: 15 },
          { hole_number: 5,  par: 5, stroke_index: 3 },
          { hole_number: 6,  par: 4, stroke_index: 11 },
          { hole_number: 7,  par: 4, stroke_index: 13 },
          { hole_number: 8,  par: 3, stroke_index: 5 },
          { hole_number: 9,  par: 4, stroke_index: 17 },
          { hole_number: 10, par: 4, stroke_index: 2 },
          { hole_number: 11, par: 3, stroke_index: 16 },
          { hole_number: 12, par: 5, stroke_index: 8 },
          { hole_number: 13, par: 4, stroke_index: 14 },
          { hole_number: 14, par: 4, stroke_index: 4 },
          { hole_number: 15, par: 3, stroke_index: 18 },
          { hole_number: 16, par: 4, stroke_index: 10 },
          { hole_number: 17, par: 5, stroke_index: 6 },
          { hole_number: 18, par: 4, stroke_index: 12 },
        ],
      },
      {
        courseName: "Sand Hollow Resort",
        tees: [
          { name: "Black", yardage: 7315, rating: 73.7, slope: 137 },
          { name: "Blue",  yardage: 6893, rating: 71.8, slope: 126 },
          { name: "White", yardage: 6462, rating: 69.6, slope: 126 },
          { name: "Gold",  yardage: 6060, rating: 68.1, slope: 116 },
        ],
        holes: [
          { hole_number: 1,  par: 4, stroke_index: 15 },
          { hole_number: 2,  par: 5, stroke_index: 7 },
          { hole_number: 3,  par: 3, stroke_index: 17 },
          { hole_number: 4,  par: 4, stroke_index: 5 },
          { hole_number: 5,  par: 4, stroke_index: 13 },
          { hole_number: 6,  par: 4, stroke_index: 1 },
          { hole_number: 7,  par: 5, stroke_index: 3 },
          { hole_number: 8,  par: 3, stroke_index: 11 },
          { hole_number: 9,  par: 4, stroke_index: 9 },
          { hole_number: 10, par: 5, stroke_index: 10 },
          { hole_number: 11, par: 3, stroke_index: 16 },
          { hole_number: 12, par: 4, stroke_index: 2 },
          { hole_number: 13, par: 4, stroke_index: 14 },
          { hole_number: 14, par: 4, stroke_index: 4 },
          { hole_number: 15, par: 3, stroke_index: 8 },
          { hole_number: 16, par: 4, stroke_index: 18 },
          { hole_number: 17, par: 5, stroke_index: 12 },
          { hole_number: 18, par: 4, stroke_index: 6 },
        ],
      },
      {
        courseName: "Copper Rock Golf Course",
        tees: [
          { name: "Copper", yardage: 7227, rating: 74.9, slope: 135 },
          { name: "Black",  yardage: 6628, rating: 72.1, slope: 130 },
          { name: "Gold",   yardage: 6029, rating: 69.2, slope: 125 },
          { name: "Silver", yardage: 5718, rating: 67.8, slope: 120 },
          { name: "White",  yardage: 5046, rating: 64.5, slope: 110 },
        ],
        holes: [
          { hole_number: 1,  par: 5, stroke_index: 16 },
          { hole_number: 2,  par: 4, stroke_index: 2 },
          { hole_number: 3,  par: 4, stroke_index: 12 },
          { hole_number: 4,  par: 3, stroke_index: 14 },
          { hole_number: 5,  par: 5, stroke_index: 8 },
          { hole_number: 6,  par: 4, stroke_index: 18 },
          { hole_number: 7,  par: 3, stroke_index: 4 },
          { hole_number: 8,  par: 4, stroke_index: 6 },
          { hole_number: 9,  par: 4, stroke_index: 10 },
          { hole_number: 10, par: 4, stroke_index: 7 },
          { hole_number: 11, par: 4, stroke_index: 9 },
          { hole_number: 12, par: 5, stroke_index: 13 },
          { hole_number: 13, par: 4, stroke_index: 1 },
          { hole_number: 14, par: 4, stroke_index: 3 },
          { hole_number: 15, par: 3, stroke_index: 17 },
          { hole_number: 16, par: 5, stroke_index: 11 },
          { hole_number: 17, par: 3, stroke_index: 15 },
          { hole_number: 18, par: 4, stroke_index: 5 },
        ],
      },
      {
        courseName: "Black Desert Resort",
        tees: [
          { name: "Tournament",   yardage: 7288, rating: 74.9, slope: 138 },
          { name: "Black Desert", yardage: 6868, rating: 72.9, slope: 134 },
          { name: "Weiskopf",     yardage: 6414, rating: 70.8, slope: 126 },
          { name: "Snow Canyon",  yardage: 5697, rating: 67.1, slope: 120 },
          { name: "Red Cliffs",   yardage: 4973, rating: 63.4, slope: 112 },
        ],
        holes: [
          { hole_number: 1,  par: 4, stroke_index: 9 },
          { hole_number: 2,  par: 4, stroke_index: 11 },
          { hole_number: 3,  par: 3, stroke_index: 15 },
          { hole_number: 4,  par: 4, stroke_index: 1 },
          { hole_number: 5,  par: 4, stroke_index: 13 },
          { hole_number: 6,  par: 4, stroke_index: 5 },
          { hole_number: 7,  par: 5, stroke_index: 3 },
          { hole_number: 8,  par: 3, stroke_index: 17 },
          { hole_number: 9,  par: 5, stroke_index: 7 },
          { hole_number: 10, par: 4, stroke_index: 14 },
          { hole_number: 11, par: 4, stroke_index: 2 },
          { hole_number: 12, par: 4, stroke_index: 6 },
          { hole_number: 13, par: 5, stroke_index: 10 },
          { hole_number: 14, par: 4, stroke_index: 16 },
          { hole_number: 15, par: 3, stroke_index: 12 },
          { hole_number: 16, par: 4, stroke_index: 4 },
          { hole_number: 17, par: 3, stroke_index: 18 },
          { hole_number: 18, par: 5, stroke_index: 8 },
        ],
      },
    ];

    const { data: courseRowsForSeeds } = await sb
      .from("courses")
      .select("id,name");

    const seedCourseId = (name: string) =>
      courseRowsForSeeds?.find((c) => c.name === name)?.id ?? null;

    for (const cs of courseSeeds) {
      const cid = seedCourseId(cs.courseName);
      if (!cid) continue;
      const teeRows = cs.tees.map((t) => ({ course_id: cid, ...t }));
      await sb
        .from("tees")
        .upsert(teeRows, { onConflict: "course_id,name", ignoreDuplicates: true });
      const holeRows = cs.holes.map((h) => ({ course_id: cid, ...h }));
      await sb
        .from("holes")
        .upsert(holeRows, {
          onConflict: "course_id,hole_number",
          ignoreDuplicates: true,
        });
    }

    // Rounds
    const { data: courseRows } = await sb.from("courses").select("id,name");
    const courseId = (name: string) =>
      courseRows?.find((c) => c.name === name)?.id ?? null;

    const roundsToInsert = [
      { round_number: 1, course_id: courseId("Wolf Creek Golf Club"), played_on: "2026-05-27", status: "pending" },
      { round_number: 2, course_id: courseId("Sand Hollow Resort"), played_on: "2026-05-28", status: "pending" },
      { round_number: 3, course_id: courseId("Copper Rock Golf Course"), played_on: "2026-05-29", status: "pending" },
      { round_number: 4, course_id: courseId("Black Desert Resort"), played_on: "2026-05-30", status: "pending" },
      { round_number: 5, course_id: courseId("Black Desert Resort"), played_on: "2026-05-30", status: "pending" },
    ].filter((r) => r.course_id != null);

    if (roundsToInsert.length) {
      await sb
        .from("rounds")
        .upsert(roundsToInsert, { onConflict: "round_number", ignoreDuplicates: true });
    }

    // Skin pots — one row per round.
    const { data: roundRows } = await sb.from("rounds").select("id");
    if (roundRows?.length) {
      const potRows = roundRows.map((r) => ({
        round_id: r.id,
        base_pot: 300,
        carry_in: 0,
        total_skins_won: 0,
        carry_out: 0,
      }));
      await sb
        .from("skin_pots")
        .upsert(potRows, { onConflict: "round_id", ignoreDuplicates: true });
    }

    const totalTees = courseSeeds.reduce((s, c) => s + c.tees.length, 0);
    const totalHoles = courseSeeds.reduce((s, c) => s + c.holes.length, 0);
    revalidateAll();
    return {
      ok: true,
      message: `Loaded ${players.length} players, ${courses.length} courses, ${totalTees} tees, ${totalHoles} holes, and ${roundsToInsert.length} rounds.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: (err as Error).message,
    };
  }
}

// ============================================================================
// PLAYERS
// ============================================================================

export async function createPlayerAction(input: {
  name: string;
  ghin: string | null;
  startingIndex: number;
  currentIndex: number;
  sortOrder?: number;
}): Promise<{ ok: true; playerId: string } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();
  if (!input.name.trim()) return { ok: false, error: "Name is required." };
  if (!Number.isFinite(input.startingIndex) || !Number.isFinite(input.currentIndex)) {
    return { ok: false, error: "Indexes must be numbers." };
  }
  // Default sort_order to one past the current max.
  let sortOrder = input.sortOrder;
  if (sortOrder == null) {
    const { data: existing } = await sb
      .from("players")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    sortOrder = ((existing?.[0]?.sort_order as number | undefined) ?? 0) + 1;
  }
  const { data, error } = await sb
    .from("players")
    .insert({
      name: input.name.trim(),
      ghin: input.ghin?.trim() || null,
      starting_index: input.startingIndex,
      current_index: input.currentIndex,
      sort_order: sortOrder,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  revalidateAll();
  return { ok: true, playerId: data.id };
}

export async function updatePlayerAction(input: {
  playerId: string;
  name: string;
  ghin: string | null;
  startingIndex: number;
  currentIndex: number;
  sortOrder: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();
  if (!input.name.trim()) return { ok: false, error: "Name is required." };
  const { error } = await sb
    .from("players")
    .update({
      name: input.name.trim(),
      ghin: input.ghin?.trim() || null,
      starting_index: input.startingIndex,
      current_index: input.currentIndex,
      sort_order: input.sortOrder,
    })
    .eq("id", input.playerId);
  if (error) return { ok: false, error: error.message };

  // Index change → CH change → strokes-received per hole change. Recompute
  // every round this player has hole_scores in.
  const { data: theirHoleRounds } = await sb
    .from("hole_scores")
    .select("round_id")
    .eq("player_id", input.playerId);
  const roundIds = Array.from(
    new Set((theirHoleRounds ?? []).map((r) => r.round_id as string)),
  );
  for (const rid of roundIds) {
    await recomputeNetToParForRound(rid);
    await recomputeSkinsForRound(rid);
  }
  // Starting-index change cascades into the adjustment chain; rebuild it.
  await recomputeHandicapAdjustments();

  revalidateAll();
  return { ok: true };
}

export async function deletePlayerAction(input: {
  playerId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();
  // Capture every round the player has hole_scores in BEFORE the cascade
  // deletes them, so we can recompute skins afterward.
  const { data: theirHoleRounds } = await sb
    .from("hole_scores")
    .select("round_id")
    .eq("player_id", input.playerId);
  const roundIds = Array.from(
    new Set((theirHoleRounds ?? []).map((r) => r.round_id as string)),
  );

  const { error } = await sb.from("players").delete().eq("id", input.playerId);
  if (error) return { ok: false, error: error.message };

  for (const rid of roundIds) {
    await recomputeSkinsForRound(rid);
  }
  // Cascade also nuked their scores and adjustments; rebuild so other
  // players' adjustment history stays clean.
  await recomputeHandicapAdjustments();
  revalidateAll();
  return { ok: true };
}

// ============================================================================
// AUTH
// ============================================================================

export async function loginAction(formData: FormData) {
  const pw = String(formData.get("password") ?? "");
  if (!verifyPassword(pw)) {
    return { ok: false as const, error: "Incorrect password." };
  }
  setAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  clearAdminSession();
  redirect("/admin/login");
}

// ============================================================================
// TEE MANAGEMENT
// ============================================================================

export async function createTeeAction(input: {
  courseId: string;
  name: string;
  yardage: number | null;
  rating: number;
  slope: number;
}): Promise<{ ok: true; teeId: string } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("tees")
    .insert({
      course_id: input.courseId,
      name: input.name,
      yardage: input.yardage,
      rating: input.rating,
      slope: input.slope,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  revalidateAll();
  return { ok: true, teeId: data.id };
}

export async function setRoundTeeAction(input: {
  roundId: string;
  teeId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();
  const { error } = await sb
    .from("rounds")
    .update({ tee_id: input.teeId })
    .eq("id", input.roundId);
  if (error) return { ok: false, error: error.message };

  // Tee change → CH changes → strokes-received per hole changes → recompute.
  const { count } = await sb
    .from("hole_scores")
    .select("*", { count: "exact", head: true })
    .eq("round_id", input.roundId);
  if ((count ?? 0) > 0) {
    await recomputeNetToParForRound(input.roundId);
    await recomputeSkinsForRound(input.roundId);
  }

  revalidateAll();
  return { ok: true };
}

export async function updateTeeAction(input: {
  teeId: string;
  name: string;
  yardage: number | null;
  rating: number;
  slope: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();

  // Detect a slope/rating change so we know whether to recompute downstream
  // (every score / hole_score / skin / handicap derives from these).
  const { data: existingTee } = await sb
    .from("tees")
    .select("rating,slope")
    .eq("id", input.teeId)
    .single();
  const slopeRatingChanged =
    !existingTee ||
    Number(existingTee.slope) !== Number(input.slope) ||
    Number(existingTee.rating) !== Number(input.rating);

  const { error } = await sb
    .from("tees")
    .update({
      name: input.name,
      yardage: input.yardage,
      rating: input.rating,
      slope: input.slope,
    })
    .eq("id", input.teeId);
  if (error) return { ok: false, error: error.message };

  if (slopeRatingChanged) {
    // Every round currently pointed at this tee has stale CH/net/diff.
    // Re-derive scores rows from hole_scores grosses, then refresh skins +
    // the full handicap chain.
    const { data: affectedRounds } = await sb
      .from("rounds")
      .select("id")
      .eq("tee_id", input.teeId);
    for (const r of (affectedRounds ?? []) as Array<{ id: string }>) {
      await rebuildScoresForRound(r.id);
      await recomputeNetToParForRound(r.id);
      await recomputeSkinsForRound(r.id);
    }
    await recomputeHandicapAdjustments();
  }

  revalidateAll();
  return { ok: true };
}

/**
 * Recompute the `scores` row for every player in a round from their stored
 * per-hole grosses + the round's current tee. Only fires for players with a
 * complete 18-hole card. Used when something upstream (tee slope/rating, par,
 * SI) changes and the stored gross/CH/net/differential need refreshing.
 */
async function rebuildScoresForRound(roundId: string): Promise<void> {
  const sb = getServiceClient();
  const [{ data: round }, { data: holeScoresRaw }, { data: players }] =
    await Promise.all([
      sb.from("rounds").select("*").eq("id", roundId).single(),
      sb.from("hole_scores").select("*").eq("round_id", roundId),
      sb.from("players").select("*"),
    ]);
  if (!round || !players) return;
  if (!round.tee_id) return;

  const { data: tee } = await sb
    .from("tees")
    .select("*")
    .eq("id", round.tee_id)
    .single();
  if (!tee) return;
  const teeRow = tee as Tee;

  const { data: holesData } = await sb
    .from("holes")
    .select("*")
    .eq("course_id", round.course_id);
  const holeByNumber = new Map(
    ((holesData ?? []) as Hole[]).map((h) => [h.hole_number, h]),
  );

  // Group hole_scores by player.
  const grossesByPlayer = new Map<string, Map<number, number>>();
  for (const hs of (holeScoresRaw ?? []) as Array<{
    player_id: string;
    hole_number: number;
    gross: number | null;
  }>) {
    if (hs.gross == null) continue;
    if (!grossesByPlayer.has(hs.player_id))
      grossesByPlayer.set(hs.player_id, new Map());
    grossesByPlayer.get(hs.player_id)!.set(hs.hole_number, hs.gross);
  }

  // Preserve existing DNP markers; rebuild only the non-DNP played rows.
  const { data: existingScores } = await sb
    .from("scores")
    .select("player_id,did_not_play")
    .eq("round_id", roundId);
  const dnpSet = new Set(
    ((existingScores ?? []) as Array<{
      player_id: string;
      did_not_play: boolean;
    }>)
      .filter((s) => s.did_not_play)
      .map((s) => s.player_id),
  );

  await sb.from("scores").delete().eq("round_id", roundId);

  const inserts: Array<{
    round_id: string;
    player_id: string;
    gross: number | null;
    course_handicap: number | null;
    net: number | null;
    differential: number | null;
    did_not_play: boolean;
  }> = [];

  for (const p of players as Player[]) {
    if (dnpSet.has(p.id)) {
      inserts.push({
        round_id: roundId,
        player_id: p.id,
        gross: null,
        course_handicap: null,
        net: null,
        differential: null,
        did_not_play: true,
      });
      continue;
    }
    const playerHoles = grossesByPlayer.get(p.id);
    if (!playerHoles || playerHoles.size !== 18) continue;

    const ch = courseHandicap(Number(p.current_index), teeRow.slope);
    let adjustedSum = 0;
    for (const [holeNumber, gross] of playerHoles) {
      const hole = holeByNumber.get(holeNumber);
      const par = hole?.par ?? 4;
      const si = hole?.stroke_index ?? holeNumber;
      const strokes = strokesReceived(ch, si);
      adjustedSum += adjustedGross(gross, par, strokes);
    }
    const computed = buildScoreRow({
      index: Number(p.current_index),
      gross: adjustedSum,
      tee: { rating: Number(teeRow.rating), slope: teeRow.slope },
    });
    inserts.push({
      round_id: roundId,
      player_id: p.id,
      gross: adjustedSum,
      course_handicap: computed.course_handicap,
      net: computed.net,
      differential: computed.differential,
      did_not_play: false,
    });
  }

  if (inserts.length) {
    await sb.from("scores").insert(inserts);
  }
  const playedCount = inserts.filter((r) => !r.did_not_play).length;
  await sb
    .from("rounds")
    .update({ status: playedCount > 0 ? "complete" : "pending" })
    .eq("id", roundId);
}

export async function deleteTeeAction(input: {
  teeId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();
  // If any round is currently pointed at this tee, null it out so rounds stay valid.
  await sb.from("rounds").update({ tee_id: null }).eq("tee_id", input.teeId);
  const { error } = await sb.from("tees").delete().eq("id", input.teeId);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

// ============================================================================
// HOLE MANAGEMENT (par + stroke index per course)
// ============================================================================

export async function upsertHolesAction(input: {
  courseId: string;
  holes: Array<{ hole_number: number; par: number; stroke_index: number }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();

  // Validate: 18 unique stroke indexes 1-18, pars in [3,6], holes 1-18.
  const sis = new Set<number>();
  for (const h of input.holes) {
    if (
      !Number.isInteger(h.hole_number) ||
      h.hole_number < 1 ||
      h.hole_number > 18 ||
      !Number.isInteger(h.par) ||
      h.par < 3 ||
      h.par > 6 ||
      !Number.isInteger(h.stroke_index) ||
      h.stroke_index < 1 ||
      h.stroke_index > 18
    ) {
      return { ok: false, error: `Hole ${h.hole_number}: invalid values.` };
    }
    if (sis.has(h.stroke_index)) {
      return {
        ok: false,
        error: `Stroke index ${h.stroke_index} appears more than once.`,
      };
    }
    sis.add(h.stroke_index);
  }

  const rows = input.holes.map((h) => ({ course_id: input.courseId, ...h }));
  const { error } = await sb
    .from("holes")
    .upsert(rows, { onConflict: "course_id,hole_number" });
  if (error) return { ok: false, error: error.message };

  // Hole edits change par + strokes-received → every downstream number on
  // an affected round is stale. Rebuild scores (adjusted gross), net-to-par
  // per hole, skins, and the handicap chain.
  const { data: rounds } = await sb
    .from("rounds")
    .select("id")
    .eq("course_id", input.courseId);
  let anyComplete = false;
  for (const r of rounds ?? []) {
    const { count } = await sb
      .from("hole_scores")
      .select("*", { count: "exact", head: true })
      .eq("round_id", r.id);
    if ((count ?? 0) > 0) {
      await rebuildScoresForRound(r.id);
      await recomputeNetToParForRound(r.id);
      await recomputeSkinsForRound(r.id);
      anyComplete = true;
    }
  }
  if (anyComplete) await recomputeHandicapAdjustments();

  revalidateAll();
  return { ok: true };
}

/**
 * Re-derive net_to_par for every stored hole_score in a round after the
 * underlying par/SI changed (or after a tee swap). Reads existing gross values;
 * does nothing for rows that don't have a gross recorded.
 */
async function recomputeNetToParForRound(roundId: string) {
  const sb = getServiceClient();

  const [{ data: round }, { data: holeScoresAny }, { data: players }] =
    await Promise.all([
      sb.from("rounds").select("*").eq("id", roundId).single(),
      sb.from("hole_scores").select("*").eq("round_id", roundId),
      sb.from("players").select("*"),
    ]);
  if (!round || !holeScoresAny || !players) return;

  const { data: holes } = await sb
    .from("holes")
    .select("*")
    .eq("course_id", round.course_id);
  const holeByNumber = new Map(
    ((holes ?? []) as Hole[]).map((h) => [h.hole_number, h]),
  );

  let chByPlayer = new Map<string, number>();
  if (round.tee_id) {
    const { data: tee } = await sb
      .from("tees")
      .select("*")
      .eq("id", round.tee_id)
      .single();
    if (tee) {
      const teeRow = tee as Tee;
      chByPlayer = new Map(
        (players as Player[]).map((p) => {
          const row = buildScoreRow({
            index: Number(p.current_index),
            gross: Number(teeRow.rating),
            tee: { rating: Number(teeRow.rating), slope: teeRow.slope },
          });
          return [p.id, row.course_handicap];
        }),
      );
    }
  }

  for (const hs of holeScoresAny as Array<{
    id: string;
    player_id: string;
    hole_number: number;
    gross: number | null;
  }>) {
    if (hs.gross == null) continue;
    const hole = holeByNumber.get(hs.hole_number);
    const ch = chByPlayer.get(hs.player_id) ?? 0;
    const par = hole?.par ?? 4;
    const si = hole?.stroke_index ?? hs.hole_number;
    const strokes = strokesReceived(ch, si);
    await sb
      .from("hole_scores")
      .update({ net_to_par: adjustedNetToPar(hs.gross, par, strokes) })
      .eq("id", hs.id);
  }
}

// ============================================================================
// SCORE ENTRY (gross totals per player)
// ============================================================================

/**
 * Single-shot save for a round. Per-hole gross is the only input; everything
 * else (total gross, CH, net, differential, net-to-par per hole) is derived.
 *
 * For each player:
 *   - didNotPlay=true → scores row with null gross + did_not_play=true. No
 *     hole_scores. Counts as their auto-drop on the leaderboard.
 *   - All 18 holes entered → 18 hole_scores rows + scores row with computed
 *     total/CH/net/diff.
 *   - 1..17 holes entered → only the entered hole_scores. No scores row yet
 *     (treated as not-played on the leaderboard, but those holes still
 *     contribute to skins).
 *   - 0 holes entered + not DNP → no rows at all.
 *
 * Skins and handicap adjustments are recomputed at the end.
 */
export async function saveRoundAction(input: {
  roundId: string;
  teeId: string;
  perPlayer: Array<{
    playerId: string;
    grossByHole: (number | null)[]; // length 18
    didNotPlay: boolean;
  }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();

  const [{ data: round }, { data: tee }, { data: players }] = await Promise.all([
    sb.from("rounds").select("*").eq("id", input.roundId).single(),
    sb.from("tees").select("*").eq("id", input.teeId).single(),
    sb.from("players").select("*"),
  ]);
  if (!round || !tee || !players)
    return { ok: false, error: "Missing round/tee/players" };
  const teeRow = tee as Tee;
  const playerById = new Map((players as Player[]).map((p) => [p.id, p]));

  // Holes for this course (par + stroke index).
  const { data: holesData } = await sb
    .from("holes")
    .select("*")
    .eq("course_id", round.course_id);
  const holeByNumber = new Map(
    ((holesData ?? []) as Hole[]).map((h) => [h.hole_number, h]),
  );

  // Persist tee selection if the admin just changed it.
  if (round.tee_id !== input.teeId) {
    await sb.from("rounds").update({ tee_id: input.teeId }).eq("id", input.roundId);
  }

  // Wipe prior rows for this round; we'll re-insert from scratch.
  await Promise.all([
    sb.from("scores").delete().eq("round_id", input.roundId),
    sb.from("hole_scores").delete().eq("round_id", input.roundId),
  ]);

  const scoreInserts: Array<{
    round_id: string;
    player_id: string;
    gross: number | null;
    course_handicap: number | null;
    net: number | null;
    differential: number | null;
    did_not_play: boolean;
  }> = [];
  const holeScoreInserts: Array<{
    round_id: string;
    player_id: string;
    hole_number: number;
    gross: number;
    net_to_par: number;
  }> = [];

  for (const p of input.perPlayer) {
    const player = playerById.get(p.playerId);
    if (!player) continue;

    if (p.didNotPlay) {
      scoreInserts.push({
        round_id: input.roundId,
        player_id: p.playerId,
        gross: null,
        course_handicap: null,
        net: null,
        differential: null,
        did_not_play: true,
      });
      continue;
    }

    const ch = courseHandicap(Number(player.current_index), teeRow.slope);
    let enteredCount = 0;
    let adjustedGrossSum = 0;
    for (let i = 0; i < 18; i++) {
      const g = p.grossByHole[i];
      if (g == null || !Number.isFinite(g) || g <= 0) continue;
      const holeNumber = i + 1;
      const hole = holeByNumber.get(holeNumber);
      const par = hole?.par ?? 4;
      const si = hole?.stroke_index ?? holeNumber;
      const strokes = strokesReceived(ch, si);
      const gross = Math.trunc(g);
      // Store the actual gross they shot, but cap net-to-par at net double
      // bogey for skins / scoring purposes (WHS ESC rule).
      holeScoreInserts.push({
        round_id: input.roundId,
        player_id: p.playerId,
        hole_number: holeNumber,
        gross,
        net_to_par: adjustedNetToPar(gross, par, strokes),
      });
      enteredCount += 1;
      adjustedGrossSum += adjustedGross(gross, par, strokes);
    }

    if (enteredCount === 18) {
      // For scoring/leaderboard/differential, the "gross" we keep on the
      // scores row is the *adjusted* sum (net-double-bogey cap applied per
      // hole). hole_scores.gross still holds the raw number they shot.
      const computed = buildScoreRow({
        index: Number(player.current_index),
        gross: adjustedGrossSum,
        tee: { rating: Number(teeRow.rating), slope: teeRow.slope },
      });
      scoreInserts.push({
        round_id: input.roundId,
        player_id: p.playerId,
        gross: adjustedGrossSum,
        course_handicap: computed.course_handicap,
        net: computed.net,
        differential: computed.differential,
        did_not_play: false,
      });
    }
    // Partial entry: no scores row yet. The hole_scores still feed skins.
  }

  if (holeScoreInserts.length) {
    const { error } = await sb.from("hole_scores").insert(holeScoreInserts);
    if (error) return { ok: false, error: error.message };
  }
  if (scoreInserts.length) {
    const { error } = await sb.from("scores").insert(scoreInserts);
    if (error) return { ok: false, error: error.message };
  }

  const playedCount = scoreInserts.filter((r) => !r.did_not_play).length;
  const status = playedCount > 0 ? "complete" : "pending";
  const prevStatus = round.status;
  await sb.from("rounds").update({ status }).eq("id", input.roundId);

  // Handicap adjustments only react to *complete* rounds (rows in `scores`
  // with a non-null gross/differential). Auto-save during partial entry
  // produces nothing for the adjustment chain to chew on, so skip the
  // expensive rebuild unless the round either was complete (and might
  // need its prior adjustments revoked) or just became complete.
  if (prevStatus === "complete" || status === "complete") {
    await recomputeHandicapAdjustments();
  }
  await recomputeSkinsForRound(input.roundId);
  revalidateAll();
  return { ok: true };
}

/**
 * Recompute skins for one round and propagate carry-out to subsequent rounds.
 */
async function recomputeSkinsForRound(roundId: string) {
  const sb = getServiceClient();

  // Walk through every round in order, recomputing carry-in/out chain.
  const [{ data: rounds }, { data: pots }] = await Promise.all([
    sb.from("rounds").select("*").order("round_number"),
    sb.from("skin_pots").select("*"),
  ]);
  if (!rounds) return;

  const potByRound = new Map((pots ?? []).map((p) => [p.round_id, p]));
  let carryIn = 0;

  for (const r of rounds as Round[]) {
    const basePot = Number(potByRound.get(r.id)?.base_pot ?? 300);
    const { data: holeScores } = await sb
      .from("hole_scores")
      .select("*")
      .eq("round_id", r.id);

    const result = computeSkins(holeScores ?? [], basePot, carryIn);

    // Wipe + insert skins for this round.
    await sb.from("skins").delete().eq("round_id", r.id);
    if (result.skins.length > 0) {
      await sb.from("skins").insert(
        result.skins.map((s) => ({
          round_id: r.id,
          hole_number: s.hole_number,
          winner_player_id: s.winner_player_id,
          value: s.value,
        })),
      );
    }

    // Update pot row.
    await sb.from("skin_pots").upsert({
      round_id: r.id,
      base_pot: basePot,
      carry_in: carryIn,
      total_skins_won: result.totalSkins,
      carry_out: result.carryOut,
    });

    carryIn = result.carryOut;
  }
  // unused param appeasement
  void roundId;
}

// ============================================================================
// HANDICAP ADJUSTMENT
// ============================================================================

/**
 * Rebuild every player's current_index and the handicap_adjustments history
 * from scratch, based on the current state of `scores`. Called whenever a
 * round is saved, reset, or a player is edited/deleted — so any score
 * deletion correctly reverts indexes and removes stranded adjustment rows.
 *
 * Steps:
 *   1. Wipe all handicap_adjustments and reset every player's current_index
 *      to their starting_index.
 *   2. Walk rounds in order (1 → 5). After each *completed* round, recompute
 *      each player's cumulative differential average. If it warrants an
 *      adjustment (5+ strokes better than starting), apply it and emit one
 *      adjustment row stamped with that round number.
 *
 * The argument is ignored — kept for backward compatibility with callers
 * that used to pass `round.round_number`.
 */
async function recomputeHandicapAdjustments(_afterRound?: number): Promise<void> {
  void _afterRound;
  const sb = getServiceClient();

  const [{ data: playersRaw }, { data: scoresRaw }, { data: roundsRaw }] =
    await Promise.all([
      sb.from("players").select("*"),
      sb.from("scores").select("*"),
      sb.from("rounds").select("*").order("round_number"),
    ]);
  if (!playersRaw || !roundsRaw) return;

  const allPlayers = playersRaw as Player[];
  const allScores = (scoresRaw ?? []) as Score[];
  const allRounds = roundsRaw as Round[];

  // 1. Wipe adjustments + reset every player to their starting index.
  await sb
    .from("handicap_adjustments")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  for (const p of allPlayers) {
    const starting = Number(p.starting_index);
    if (Number(p.current_index) !== starting) {
      await sb
        .from("players")
        .update({ current_index: starting })
        .eq("id", p.id);
    }
  }

  // 2. Walk completed rounds in order, re-deriving each player's index.
  const roundNumberById = new Map(allRounds.map((r) => [r.id, r.round_number]));
  const runningIndex = new Map<string, number>(
    allPlayers.map((p) => [p.id, Number(p.starting_index)]),
  );

  for (const round of allRounds.filter((r) => r.status === "complete")) {
    for (const p of allPlayers) {
      const diffs = allScores
        .filter(
          (s) =>
            s.player_id === p.id &&
            s.differential != null &&
            !s.did_not_play,
        )
        .filter((s) => {
          const rn = roundNumberById.get(s.round_id);
          return rn != null && rn <= round.round_number;
        })
        .map((s) => Number(s.differential));

      if (diffs.length === 0) continue;

      const before = runningIndex.get(p.id) ?? Number(p.starting_index);
      const adj = computeHandicapAdjustment({
        startingIndex: Number(p.starting_index),
        currentIndex: before,
        differentials: diffs,
      });
      if (!adj) continue;

      runningIndex.set(p.id, adj.newIndex);
      await sb
        .from("players")
        .update({ current_index: adj.newIndex })
        .eq("id", p.id);
      await sb.from("handicap_adjustments").insert({
        player_id: p.id,
        after_round: round.round_number,
        rounds_counted: adj.roundsCounted,
        avg_differential: adj.avgDifferential,
        old_index: before,
        new_index: adj.newIndex,
      });
    }
  }
}

// ============================================================================
// ROUND METADATA (date, course)
// ============================================================================

export async function updateRoundMetaAction(input: {
  roundId: string;
  playedOn: string | null;
  courseId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();
  const patch: Record<string, unknown> = {};
  if (input.playedOn !== null) patch.played_on = input.playedOn || null;
  if (input.courseId !== null) patch.course_id = input.courseId;
  const { error } = await sb
    .from("rounds")
    .update(patch)
    .eq("id", input.roundId);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function resetRoundAction(input: {
  roundId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  requireAdmin();
  const sb = getServiceClient();
  await sb.from("scores").delete().eq("round_id", input.roundId);
  await sb.from("hole_scores").delete().eq("round_id", input.roundId);
  await sb.from("skins").delete().eq("round_id", input.roundId);
  await sb.from("rounds").update({ status: "pending" }).eq("id", input.roundId);
  // Recompute handles all the bookkeeping: clears stranded adjustment rows,
  // restores indexes for affected players, recomputes skin carryout chain.
  await recomputeSkinsForRound(input.roundId);
  await recomputeHandicapAdjustments();
  revalidateAll();
  return { ok: true };
}
