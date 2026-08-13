ALTER TABLE public.power_score_floor_ddl_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.power_score_floor_ddl_backup FROM anon, authenticated;
GRANT ALL ON public.power_score_floor_ddl_backup TO service_role;