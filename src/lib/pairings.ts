import type { LeaderboardRow, Player } from "./types";

/**
 * Group assignments for each round, keyed by player's last name. R1–R4 are
 * hardcoded. R5 is computed live from standings going into the final.
 *
 * R5 ordering rule (from drbill): bottom 4 tee off first ("Chasers"),
 * middle 4 second, top 4 last ("Marquee"). Hoffmann is missing R3, so going
 * into R5 he has 3 played rounds; for SEEDING purposes only, his average
 * net is extrapolated to 4 rounds (avg × 4) so he's comparable.
 */

export type PairingGroup = {
  label: string; // e.g. "Group 1", "Marquee", "Chasers"
  subtitle?: string; // e.g. "off first", "1–4"
  players: string[]; // player.id list
  marquee?: boolean; // highlight the headliner group
};

// Last-name → player-id lookup helper.
function idByLastName(players: Player[], lastName: string): string | null {
  const lc = lastName.toLowerCase();
  const match = players.find((p) => {
    const parts = p.name.split(/\s+/);
    const ln = parts[parts.length - 1].toLowerCase();
    return ln === lc;
  });
  return match?.id ?? null;
}

function lookupGroup(players: Player[], lastNames: string[]): string[] {
  return lastNames
    .map((ln) => idByLastName(players, ln))
    .filter((x): x is string => !!x);
}

const STATIC_PAIRINGS: Record<
  number,
  Array<{ label: string; lastNames: string[]; marquee?: boolean }>
> = {
  1: [
    { label: "Group 1", lastNames: ["Kong", "Robb", "Cash", "Keith"], marquee: true },
    { label: "Group 2", lastNames: ["Robertson", "Glade", "Robson", "Wible"] },
    { label: "Group 3", lastNames: ["Hoffmann", "Day", "Downey", "Gottman"], marquee: true },
  ],
  2: [
    { label: "Group 1", lastNames: ["Kong", "Robertson", "Downey", "Gottman"], marquee: true },
    { label: "Group 2", lastNames: ["Hoffmann", "Glade", "Cash", "Keith"], marquee: true },
    { label: "Group 3", lastNames: ["Robb", "Day", "Robson", "Wible"] },
  ],
  3: [
    { label: "Group 1", lastNames: ["Robb", "Cash", "Robson", "Gottman"] },
    { label: "Group 2", lastNames: ["Robertson", "Downey", "Wible", "Keith"] },
    {
      label: "Group 3",
      lastNames: ["Kong", "Glade", "Day"], // threesome — Hoffmann out
      marquee: true,
    },
  ],
  4: [
    {
      label: "Group 1",
      lastNames: ["Kong", "Hoffmann", "Robson", "Wible"],
      marquee: true,
    },
    { label: "Group 2", lastNames: ["Robb", "Robertson", "Glade", "Day"] },
    { label: "Group 3", lastNames: ["Cash", "Downey", "Keith", "Gottman"] },
  ],
};

export function staticPairingsFor(
  roundNumber: number,
  players: Player[],
): PairingGroup[] | null {
  const cfg = STATIC_PAIRINGS[roundNumber];
  if (!cfg) return null;
  return cfg.map((g) => ({
    label: g.label,
    players: lookupGroup(players, g.lastNames),
    marquee: g.marquee,
  }));
}

/**
 * R5 dynamic grouping based on current standings.
 *
 *   - seed_score per player = avg(played net) × 4 if they have ≥1 played
 *     round; otherwise Infinity (sinks to bottom).
 *   - Sort ascending → positions 1..12.
 *   - Group 1 (off FIRST)  = Chasers, positions 9–12
 *   - Group 2 (off SECOND) = Middle,  positions 5–8
 *   - Group 3 (off LAST)   = Marquee, positions 1–4  ← headliners go last
 */
export function dynamicR5Pairings(
  players: Player[],
  board: LeaderboardRow[],
): PairingGroup[] {
  type Seeded = { player: Player; seed: number; playedNotCounted?: boolean };
  const seeded: Seeded[] = players.map((p) => {
    const row = board.find((r) => r.player.id === p.id);
    if (!row) return { player: p, seed: Number.POSITIVE_INFINITY };
    const playedNets = row.perRound
      .filter((pr) => pr.played && pr.net != null)
      .map((pr) => pr.net as number);
    if (playedNets.length === 0) {
      return { player: p, seed: Number.POSITIVE_INFINITY };
    }
    // Average extrapolated to a 4-round equivalent so 3-rounders (Hoffmann)
    // compare apples-to-apples with 4-rounders.
    const avg = playedNets.reduce((s, n) => s + n, 0) / playedNets.length;
    return { player: p, seed: avg * 4 };
  });

  seeded.sort((a, b) => a.seed - b.seed);

  const chasers = seeded.slice(8, 12); // positions 9–12
  const middle = seeded.slice(4, 8); // positions 5–8
  const marquee = seeded.slice(0, 4); // positions 1–4

  return [
    {
      label: "Group 1 (off first)",
      subtitle: "Chasers · positions 9–12",
      players: chasers.map((s) => s.player.id),
    },
    {
      label: "Group 2",
      subtitle: "Middle · positions 5–8",
      players: middle.map((s) => s.player.id),
    },
    {
      label: "Group 3 (off last)",
      subtitle: "Marquee · positions 1–4",
      players: marquee.map((s) => s.player.id),
      marquee: true,
    },
  ];
}
