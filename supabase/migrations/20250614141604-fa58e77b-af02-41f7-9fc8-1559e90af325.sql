
-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read messages (as requested)
CREATE POLICY "Authenticated users can read messages" ON messages
  FOR SELECT 
  TO authenticated
  USING (true);

-- Allow users to create messages only if they belong to the team they're posting to
-- or allow general messages (team_id is null)
CREATE POLICY "Users can create messages for their teams" ON messages
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    team_id IS NULL OR 
    team_id IN (
      SELECT team_id 
      FROM team_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to update only their own messages
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow users to delete only their own messages
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

-- Enable RLS on profiles table (if not already enabled)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public' 
        AND t.tablename = 'profiles'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Add profile policies only if they don't exist
DO $$
BEGIN
    -- Check if "Users can read their own profile" policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can read their own profile'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can read their own profile" ON profiles
          FOR SELECT 
          TO authenticated
          USING (id = auth.uid())';
    END IF;
END $$;

-- Enable RLS on team_memberships table for additional security
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- Allow users to read memberships they're part of
CREATE POLICY "Users can read their own memberships" ON team_memberships
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to read team memberships for teams they belong to
CREATE POLICY "Team members can read team memberships" ON team_memberships
  FOR SELECT 
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id 
      FROM team_memberships tm 
      WHERE tm.user_id = auth.uid()
    )
  );
