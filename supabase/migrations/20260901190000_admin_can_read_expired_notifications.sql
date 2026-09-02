-- Admins must be able to read an expired notification.
--
-- The only SELECT policy on admin_notifications allowed a row while
-- `expires_at IS NULL OR expires_at > now()`. That policy applies to admins too,
-- so once a notification expired it vanished from the admin list: the EXPIRED
-- tag could never be seen after a refresh, and the row could no longer be
-- edited or deleted from the product. The UPDATE and DELETE policies were
-- unreachable for exactly the rows an admin most needs to clear.
--
-- Postgres ORs multiple permissive SELECT policies together, so this widens the
-- read for admins only. Visitors are unaffected: they still see non-expired
-- notifications only.
--
-- Applied by hand — see docs/OPERATIONS.md §6. Until it is run, the admin list
-- behaves as it does today and drops a notification once it expires.

DROP POLICY IF EXISTS "Admins can view expired notifications" ON public.admin_notifications;

CREATE POLICY "Admins can view expired notifications"
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());
