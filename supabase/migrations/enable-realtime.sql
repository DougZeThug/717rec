
-- Enable realtime for match_comments
ALTER TABLE public.match_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_comments;

-- Enable realtime for match_reactions
ALTER TABLE public.match_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_reactions;
