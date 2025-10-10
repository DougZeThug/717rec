-- Fix: Add SELECT policy for messages table
-- This allows authenticated users to view messages on the message board

CREATE POLICY "Authenticated users can view messages"
ON public.messages FOR SELECT
TO authenticated
USING (true);

-- Add comment for clarity
COMMENT ON POLICY "Authenticated users can view messages" ON public.messages IS 
'Allows all authenticated users to read messages from the community message board';