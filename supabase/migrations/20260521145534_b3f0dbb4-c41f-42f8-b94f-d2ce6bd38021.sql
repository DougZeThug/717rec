
-- Admin Notifications: league-wide announcements broadcast to all visitors
CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  CONSTRAINT admin_notifications_title_length CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT admin_notifications_body_length CHECK (char_length(body) BETWEEN 1 AND 1000)
);

CREATE INDEX admin_notifications_created_at_idx
  ON public.admin_notifications (created_at DESC);

-- updated_at trigger
CREATE TRIGGER admin_notifications_set_updated_at
  BEFORE UPDATE ON public.admin_notifications
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_timestamp();

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: everyone (anon + authenticated) can read non-expired notifications
CREATE POLICY "Anyone can view active notifications"
  ON public.admin_notifications
  FOR SELECT
  TO public
  USING (expires_at IS NULL OR expires_at > now());

-- INSERT / UPDATE / DELETE: admins only
CREATE POLICY "Admins can insert notifications"
  ON public.admin_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications
  FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Admins can delete notifications"
  ON public.admin_notifications
  FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;
