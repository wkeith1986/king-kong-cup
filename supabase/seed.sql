-- King Kong Cup — seed data
-- Run this AFTER schema.sql, in the same SQL Editor.
-- It is idempotent: re-running will not create duplicates.
-- Tee / hole numbers are the latest canonical scorecard values; if a course
-- re-rates a tee between seed time and game day, edit it in the admin UI
-- (Admin → Courses) rather than re-running this file.

-- ===== PLAYERS =====
insert into players (name, starting_index, current_index, ghin, sort_order)
values
  ('Andrew Robb',     1.9,  1.9,  '998865',    1),
  ('Kip Robertson',   2.5,  2.5,  '6087170',   2),
  ('Marc Hoffmann',   6.8,  6.8,  '10646917',  3),
  ('Bill Day',        8.0,  8.0,  '2619855',   4),
  ('Dave Cash',       8.2,  8.2,  '51511',     5),
  ('Jarrod Robson',   11.4, 11.4, '732201',    6),
  ('Tae Kong',        12.3, 12.3, '1902696',   7),
  ('Rob Downey',        12.6, 12.6, '1331159',   8),
  ('Brandt Wibel',    16.0, 16.0, '2316198',   9),
  ('Craig Jeffries',  18.0, 18.0, null,        10),
  ('Bill Keith',      21.0, 21.0, '2183718',   11),
  ('Eric Gottman',    22.0, 22.0, null,        12)
on conflict do nothing;

-- ===== COURSES =====
insert into courses (name, location, par) values
  ('Wolf Creek Golf Club',     'Mesquite, NV',  72),
  ('Sand Hollow Resort',       'Hurricane, UT', 72),
  ('Copper Rock Golf Course',  'Hurricane, UT', 72),
  ('Black Desert Resort',      'Ivins, UT',     72)
on conflict do nothing;

-- ===== TEES =====
-- Wolf Creek
insert into tees (course_id, name, yardage, rating, slope)
select c.id, t.name, t.yardage, t.rating, t.slope
from courses c
cross join (values
  ('Challenger', 6939, 74.8, 149),
  ('Champions',  6309, 71.8, 144),
  ('Masters',    5798, 68.8, 137),
  ('Signature',  5064, 66.1, 117),
  ('Classics',   4101, 62.8, 114)
) as t(name, yardage, rating, slope)
where c.name = 'Wolf Creek Golf Club'
on conflict do nothing;

-- Sand Hollow — Championship
insert into tees (course_id, name, yardage, rating, slope)
select c.id, t.name, t.yardage, t.rating, t.slope
from courses c
cross join (values
  ('Black', 7315, 73.7, 137),
  ('Blue',  6893, 71.8, 126),
  ('White', 6462, 69.6, 126),
  ('Gold',  6060, 68.1, 116)
) as t(name, yardage, rating, slope)
where c.name = 'Sand Hollow Resort'
on conflict do nothing;

-- Copper Rock
insert into tees (course_id, name, yardage, rating, slope)
select c.id, t.name, t.yardage, t.rating, t.slope
from courses c
cross join (values
  ('Copper', 7227, 74.9, 135),
  ('Black',  6628, 72.1, 130),
  ('Gold',   6029, 69.2, 125),
  ('Silver', 5718, 67.8, 120),
  ('White',  5046, 64.5, 110)
) as t(name, yardage, rating, slope)
where c.name = 'Copper Rock Golf Course'
on conflict do nothing;

-- Black Desert
insert into tees (course_id, name, yardage, rating, slope)
select c.id, t.name, t.yardage, t.rating, t.slope
from courses c
cross join (values
  ('Tournament',   7288, 74.9, 138),
  ('Black Desert', 6868, 72.9, 134),
  ('Weiskopf',     6414, 70.8, 126),
  ('Snow Canyon',  5697, 67.1, 120),
  ('Red Cliffs',   4973, 63.4, 112)
) as t(name, yardage, rating, slope)
where c.name = 'Black Desert Resort'
on conflict do nothing;

-- ===== HOLES (par + stroke index per course, shared across tees) =====
-- Wolf Creek
insert into holes (course_id, hole_number, par, stroke_index)
select c.id, h.hole_number, h.par, h.stroke_index
from courses c
cross join (values
  (1, 5, 9),  (2, 4, 1),  (3, 3, 7),  (4, 4, 15), (5, 5, 3),
  (6, 4, 11), (7, 4, 13), (8, 3, 5),  (9, 4, 17),
  (10, 4, 2), (11, 3, 16),(12, 5, 8), (13, 4, 14),(14, 4, 4),
  (15, 3, 18),(16, 4, 10),(17, 5, 6), (18, 4, 12)
) as h(hole_number, par, stroke_index)
where c.name = 'Wolf Creek Golf Club'
on conflict do nothing;

-- Sand Hollow — Championship
insert into holes (course_id, hole_number, par, stroke_index)
select c.id, h.hole_number, h.par, h.stroke_index
from courses c
cross join (values
  (1, 4, 15), (2, 5, 7),  (3, 3, 17), (4, 4, 5),  (5, 4, 13),
  (6, 4, 1),  (7, 5, 3),  (8, 3, 11), (9, 4, 9),
  (10, 5, 10),(11, 3, 16),(12, 4, 2), (13, 4, 14),(14, 4, 4),
  (15, 3, 8), (16, 4, 18),(17, 5, 12),(18, 4, 6)
) as h(hole_number, par, stroke_index)
where c.name = 'Sand Hollow Resort'
on conflict do nothing;

-- Copper Rock
insert into holes (course_id, hole_number, par, stroke_index)
select c.id, h.hole_number, h.par, h.stroke_index
from courses c
cross join (values
  (1, 5, 16), (2, 4, 2),  (3, 4, 12), (4, 3, 14), (5, 5, 8),
  (6, 4, 18), (7, 3, 4),  (8, 4, 6),  (9, 4, 10),
  (10, 4, 7), (11, 4, 9), (12, 5, 13),(13, 4, 1), (14, 4, 3),
  (15, 3, 17),(16, 5, 11),(17, 3, 15),(18, 4, 5)
) as h(hole_number, par, stroke_index)
where c.name = 'Copper Rock Golf Course'
on conflict do nothing;

-- Black Desert
insert into holes (course_id, hole_number, par, stroke_index)
select c.id, h.hole_number, h.par, h.stroke_index
from courses c
cross join (values
  (1, 4, 9),  (2, 4, 11), (3, 3, 15), (4, 4, 1),  (5, 4, 13),
  (6, 4, 5),  (7, 5, 3),  (8, 3, 17), (9, 5, 7),
  (10, 4, 14),(11, 4, 2), (12, 4, 6), (13, 5, 10),(14, 4, 16),
  (15, 3, 12),(16, 4, 4), (17, 3, 18),(18, 5, 8)
) as h(hole_number, par, stroke_index)
where c.name = 'Black Desert Resort'
on conflict do nothing;

-- ===== ROUNDS =====
insert into rounds (round_number, course_id, played_on, status)
select 1, id, '2026-05-27'::date, 'pending' from courses where name = 'Wolf Creek Golf Club'
on conflict do nothing;

insert into rounds (round_number, course_id, played_on, status)
select 2, id, '2026-05-28'::date, 'pending' from courses where name = 'Sand Hollow Resort'
on conflict do nothing;

insert into rounds (round_number, course_id, played_on, status)
select 3, id, '2026-05-29'::date, 'pending' from courses where name = 'Copper Rock Golf Course'
on conflict do nothing;

insert into rounds (round_number, course_id, played_on, status)
select 4, id, '2026-05-30'::date, 'pending' from courses where name = 'Black Desert Resort'
on conflict do nothing;

insert into rounds (round_number, course_id, played_on, status)
select 5, id, '2026-05-30'::date, 'pending' from courses where name = 'Black Desert Resort'
on conflict do nothing;

-- ===== SKIN POTS (one row per round, $300 base) =====
insert into skin_pots (round_id, base_pot, carry_in, total_skins_won, carry_out)
select r.id, 300, 0, 0, 0 from rounds r
on conflict do nothing;
