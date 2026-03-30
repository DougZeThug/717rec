
-- Enable REPLICA IDENTITY FULL for realtime tables (so DELETE payloads include old row data)
ALTER TABLE public."match_comments" REPLICA IDENTITY FULL;
ALTER TABLE public."match_reactions" REPLICA IDENTITY FULL;
ALTER TABLE public."messages" REPLICA IDENTITY FULL;
ALTER TABLE public."message_reactions" REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'match_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."match_comments";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'match_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."match_reactions";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."messages";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."message_reactions";
  END IF;
END $$;
