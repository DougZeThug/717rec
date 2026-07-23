-- finalize_playoffs upserts archive snapshots with ON CONFLICT (season_id, team_id).
-- Keep the matching uniqueness in the schema so smoke tests and production
-- archival paths fail fast on duplicate archive snapshots instead of runtime drift.
CREATE UNIQUE INDEX IF NOT EXISTS team_details_archive_season_team_unique
  ON public.team_details_archive (season_id, team_id);
