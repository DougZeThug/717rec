ALTER TABLE public.brackets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.brackets;