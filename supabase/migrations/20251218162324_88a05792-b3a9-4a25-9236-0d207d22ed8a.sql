-- Enable full row data for realtime updates on brackets-manager storage table
ALTER TABLE public."match" REPLICA IDENTITY FULL;

-- Add table to realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'match'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."match";
  END IF;
END $$;