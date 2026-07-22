-- PR-13: persist brackets-manager opponent slot positions.
--
-- brackets-manager stores a structural "origin position" inside each match
-- opponent slot (written at stage creation): it identifies WHICH feeder match
-- the slot's participant arrives from, and the library re-reads it to route
-- winners/losers (e.g. losers-bracket minor rounds resolve their
-- winner-bracket feeder via opponent1.position). The flattened match schema
-- had no column for it, so the value was lost on every round-trip — the
-- storage adapter then substituted the participant's SEED position, sending
-- the library to look up nonexistent matches ("Match not found." /
-- "Position is undefined."), which is what the old auto-repair layer papered
-- over.
--
-- Additive and replay-clean. Legacy match rows keep NULL positions: brackets
-- created before this migration cannot faithfully re-derive their feeders,
-- and mid-flight legacy double-elimination brackets may still need the
-- explicit admin repair tools. New brackets persist positions from creation.

ALTER TABLE public.match
  ADD COLUMN IF NOT EXISTS opponent1_position integer,
  ADD COLUMN IF NOT EXISTS opponent2_position integer;
