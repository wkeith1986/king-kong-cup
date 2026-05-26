export type Player = {
  id: string;
  name: string;
  starting_index: number;
  current_index: number;
  ghin: string | null;
  sort_order: number;
};

export type Course = {
  id: string;
  name: string;
  location: string | null;
  par: number;
};

export type Tee = {
  id: string;
  course_id: string;
  name: string;
  yardage: number | null;
  rating: number;
  slope: number;
};

export type Hole = {
  id: string;
  course_id: string;
  hole_number: number;
  par: number;
  stroke_index: number;
};

export type Round = {
  id: string;
  round_number: number;
  course_id: string;
  tee_id: string | null;
  played_on: string | null;
  status: "pending" | "complete";
};

export type Score = {
  id: string;
  round_id: string;
  player_id: string;
  gross: number | null;
  course_handicap: number | null;
  net: number | null;
  differential: number | null;
  did_not_play: boolean;
};

export type HoleScore = {
  id: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  gross: number | null;
  net_to_par: number;
};

export type Skin = {
  id: string;
  round_id: string;
  hole_number: number;
  winner_player_id: string;
  value: number;
};

export type SkinPot = {
  round_id: string;
  base_pot: number;
  carry_in: number;
  total_skins_won: number;
  carry_out: number;
};

export type HandicapAdjustment = {
  id: string;
  player_id: string;
  after_round: number;
  rounds_counted: number;
  avg_differential: number;
  old_index: number;
  new_index: number;
  created_at: string;
};

export type LeaderboardRow = {
  player: Player;
  perRound: Array<{
    round_number: number;
    gross: number | null;
    net: number | null;
    course_handicap: number | null;
    isDrop: boolean;
    isDNP: boolean;
    played: boolean;
  }>;
  totalNet: number | null;
  bestFourNet: number | null;
  position: number;
  isTied: boolean;
  movement: number; // positions gained since previous round (positive = moved up)
};
