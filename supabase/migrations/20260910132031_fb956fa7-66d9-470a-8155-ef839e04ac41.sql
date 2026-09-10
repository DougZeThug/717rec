INSERT INTO public.team_timeslots (match_date, team_id, timeslot, is_back_to_back, is_double_header, pair_slot, match_sequence)
SELECT '2026-09-10'::date, t.id, v.slot, true, true, v.pair, v.seq
FROM public.teams t
CROSS JOIN (VALUES ('6:30 PM','7:00 PM',1),('7:00 PM','6:30 PM',2)) AS v(slot, pair, seq)
WHERE t.name = 'Baggin Rights'
  AND NOT EXISTS (
    SELECT 1 FROM public.team_timeslots x
    WHERE x.team_id = t.id AND x.match_date = '2026-09-10'::date AND x.timeslot = v.slot
  );