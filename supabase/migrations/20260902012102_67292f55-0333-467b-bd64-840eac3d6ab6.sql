DROP POLICY IF EXISTS "Admins can view expired notifications" ON public.admin_notifications;

CREATE POLICY "Admins can view expired notifications"
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());