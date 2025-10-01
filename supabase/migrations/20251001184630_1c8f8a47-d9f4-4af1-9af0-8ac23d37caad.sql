-- Create Fall 2025 season
-- The ensure_single_active_season trigger will automatically deactivate any other active seasons

INSERT INTO public.seasons (name, start_date, end_date, is_active, is_archived)
VALUES ('Fall 2025', '2025-10-01', NULL, true, false);