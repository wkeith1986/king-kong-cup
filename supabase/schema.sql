-- King Kong Cup — database schema
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> "New query").
-- It is safe to re-run: every table uses CREATE TABLE IF NOT EXISTS.

create extension if not exists "pgcrypto";

-- 12 players
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starting_index numeric(4,1) not null,
  current_index numeric(4,1) not null,
  ghin text,
  sort_order int not null default 0,
  paid_entry boolean not null default false,
  created_at timestamptz not null default now()
);

-- Migration: add paid_entry on existing databases that pre-date it.
alter table players add column if not exists paid_entry boolean not null default false;

-- Courses (5 rounds, 4 distinct courses since Black Desert hosts rounds 4 & 5)
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location text,
  par int not null default 72,
  created_at timestamptz not null default now()
);

-- Tee options per course (Black/Blue/White/Gold etc.). Multiple per course.
create table if not exists tees (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  name text not null,
  yardage int,
  rating numeric(4,1) not null,
  slope int not null,
  created_at timestamptz not null default now(),
  unique (course_id, name)
);

-- Per-hole par and stroke index for each course (shared across tees).
-- Stroke index 1 = hardest hole, 18 = easiest. Odds on the front, evens on the back.
create table if not exists holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  par int not null check (par between 3 and 6),
  stroke_index int not null check (stroke_index between 1 and 18),
  unique (course_id, hole_number)
);

-- The 5 rounds of the trip
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  round_number int not null unique check (round_number between 1 and 5),
  course_id uuid not null references courses(id),
  tee_id uuid references tees(id),
  played_on date,
  status text not null default 'pending' check (status in ('pending','complete')),
  created_at timestamptz not null default now()
);

-- Per-player per-round gross + computed fields.
-- did_not_play = true means the player explicitly missed this round; the
-- leaderboard treats it as an automatic drop.
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  gross int,
  course_handicap int,
  net int,
  differential numeric(5,2),
  did_not_play boolean not null default false,
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);

-- Migration: add did_not_play column on existing databases that pre-date it.
alter table scores add column if not exists did_not_play boolean not null default false;

-- Hole-by-hole scoring for skins.
-- gross = strokes taken on that hole; net_to_par = (gross − par − strokes_received).
-- Skins compute off net_to_par; gross is what the admin types in.
create table if not exists hole_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  gross int,
  net_to_par int not null default 0,
  unique (round_id, player_id, hole_number)
);

-- Migration: add `gross` column on existing databases that pre-date it.
alter table hole_scores add column if not exists gross int;

-- Computed skins (regenerated when admin saves hole scores for a round)
create table if not exists skins (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  winner_player_id uuid not null references players(id) on delete cascade,
  value numeric(8,2) not null,
  unique (round_id, hole_number)
);

-- Carry tracking: how many dollars carry into each round from prior unclaimed rounds.
-- One row per round. Default 0.
create table if not exists skin_pots (
  round_id uuid primary key references rounds(id) on delete cascade,
  base_pot numeric(8,2) not null default 300,
  carry_in numeric(8,2) not null default 0,
  total_skins_won int not null default 0,
  carry_out numeric(8,2) not null default 0
);

-- Handicap adjustment log
create table if not exists handicap_adjustments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  after_round int not null,
  rounds_counted int not null,
  avg_differential numeric(5,2) not null,
  old_index numeric(4,1) not null,
  new_index numeric(4,1) not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists scores_round_idx on scores(round_id);
create index if not exists hole_scores_round_idx on hole_scores(round_id);
create index if not exists skins_round_idx on skins(round_id);

-- Row Level Security: public can read everything; writes go through the service role only.
alter table players enable row level security;
alter table courses enable row level security;
alter table tees enable row level security;
alter table holes enable row level security;
alter table rounds enable row level security;
alter table scores enable row level security;
alter table hole_scores enable row level security;
alter table skins enable row level security;
alter table skin_pots enable row level security;
alter table handicap_adjustments enable row level security;

-- Drop and recreate read policies (idempotent)
do $$ begin
  drop policy if exists "public read players" on players;
  drop policy if exists "public read courses" on courses;
  drop policy if exists "public read tees" on tees;
  drop policy if exists "public read holes" on holes;
  drop policy if exists "public read rounds" on rounds;
  drop policy if exists "public read scores" on scores;
  drop policy if exists "public read hole_scores" on hole_scores;
  drop policy if exists "public read skins" on skins;
  drop policy if exists "public read skin_pots" on skin_pots;
  drop policy if exists "public read handicap_adjustments" on handicap_adjustments;
end $$;

create policy "public read players" on players for select using (true);
create policy "public read courses" on courses for select using (true);
create policy "public read tees" on tees for select using (true);
create policy "public read holes" on holes for select using (true);
create policy "public read rounds" on rounds for select using (true);
create policy "public read scores" on scores for select using (true);
create policy "public read hole_scores" on hole_scores for select using (true);
create policy "public read skins" on skins for select using (true);
create policy "public read skin_pots" on skin_pots for select using (true);
create policy "public read handicap_adjustments" on handicap_adjustments for select using (true);
-- No insert/update/delete policies => the anon key cannot mutate. The app uses the
-- service-role key (server-side only) for admin writes, which bypasses RLS.
