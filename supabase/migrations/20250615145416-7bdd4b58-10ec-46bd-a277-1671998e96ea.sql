
-- Add composite index on messages table for improved query performance
-- This index optimizes team filtering, pagination, and chronological ordering
CREATE INDEX idx_messages_team_created ON public.messages(team_id, created_at DESC);

-- Add index for general message board queries (when no team filter is applied)
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Add index for user-specific message queries
CREATE INDEX idx_messages_user_created ON public.messages(user_id, created_at DESC);
