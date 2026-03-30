
-- Clean up duplicate message_reactions (keep earliest per user/message/emoji)
DELETE FROM public.message_reactions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, message_id, emoji) id
  FROM public.message_reactions
  ORDER BY user_id, message_id, emoji, created_at ASC
);

-- Clean up duplicate match_reactions (keep earliest per user/match/emoji)
DELETE FROM public.match_reactions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, match_id, emoji) id
  FROM public.match_reactions
  ORDER BY user_id, match_id, emoji, created_at ASC
);

-- Add unique constraints
ALTER TABLE public.message_reactions
  ADD CONSTRAINT message_reactions_user_message_emoji_unique
  UNIQUE (user_id, message_id, emoji);

ALTER TABLE public.match_reactions
  ADD CONSTRAINT match_reactions_user_match_emoji_unique
  UNIQUE (user_id, match_id, emoji);
