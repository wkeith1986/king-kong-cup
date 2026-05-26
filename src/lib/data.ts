import { getPublicClient } from "./supabase";
import type {
  Course,
  HandicapAdjustment,
  Hole,
  HoleScore,
  Player,
  Round,
  Score,
  Skin,
  SkinPot,
  Tee,
} from "./types";

/** All read helpers. They return [] / [] / [] etc. if Supabase is not configured
 *  so that landing pages still render before you've connected the database. */

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[supabase]", (err as Error).message);
    }
    return fallback;
  }
}

export async function getPlayers(): Promise<Player[]> {
  return safe(async () => {
    const sb = getPublicClient();
    const { data, error } = await sb
      .from("players")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Player[];
  }, []);
}

export async function getCourses(): Promise<Course[]> {
  return safe(async () => {
    const sb = getPublicClient();
    const { data, error } = await sb.from("courses").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Course[];
  }, []);
}

export async function getTees(): Promise<Tee[]> {
  return safe(async () => {
    const sb = getPublicClient();
    const { data, error } = await sb.from("tees").select("*");
    if (error) throw error;
    return (data ?? []) as Tee[];
  }, []);
}

export async function getHoles(): Promise<Hole[]> {
  return safe(async () => {
    const sb = getPublicClient();
    const { data, error } = await sb
      .from("holes")
      .select("*")
      .order("hole_number");
    if (error) throw error;
    return (data ?? []) as Hole[];
  }, []);
}

export async function getRounds(): Promise<Round[]> {
  return safe(async () => {
    const sb = getPublicClient();
    const { data, error } = await sb
      .from("rounds")
      .select("*")
      .order("round_number");
    if (error) throw error;
    return (data ?? []) as Round[];
  }, []);
}

export async function getScores(): Promise<Score[]> {
  return safe(async () => {
    const sb = getPublicClient();
    const { data, error } = await sb.from("scores").select("*");
    if (error) throw error;
    return (data ?? []) as Score[];
  }, []);
}

export async function getHoleScores(): Promise<HoleScore[]> {
  return safe(async () => {
    const sb = getPublicClient();
    const { data, error } = await sb.from("hole_scores").select("*");
    if (error) throw error;
    return (data ?? []) as HoleScore[];
  }, []);
}

export async function getSkins(): Promise<Skin[]> {
  return safe(async () => {
    const sb = getPublicClient();
    const { data, error } = await sb.from("skins").select("*");
    if (error) throw error;
    return (data ?? []) as Skin[];
  }, []);
}

export async function getSkinPots(): Promise<SkinPot[]> {
  return safe(async () => {
    const sb = getPublicClient();
    const { data, error } = await sb.from("skin_pots").select("*");
    if (error) throw error;
    return (data ?? []) as SkinPot[];
  }, []);
}

export async function getHandicapAdjustments(): Promise<HandicapAdjustment[]> {
  return safe(async () => {
    const sb = getPublicClient();
    const { data, error } = await sb
      .from("handicap_adjustments")
      .select("*")
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as HandicapAdjustment[];
  }, []);
}

export async function getAll() {
  const [
    players,
    courses,
    tees,
    holes,
    rounds,
    scores,
    holeScores,
    skins,
    skinPots,
    adjustments,
  ] = await Promise.all([
    getPlayers(),
    getCourses(),
    getTees(),
    getHoles(),
    getRounds(),
    getScores(),
    getHoleScores(),
    getSkins(),
    getSkinPots(),
    getHandicapAdjustments(),
  ]);
  return {
    players,
    courses,
    tees,
    holes,
    rounds,
    scores,
    holeScores,
    skins,
    skinPots,
    adjustments,
  };
}
