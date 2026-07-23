-- Blind draw is intentionally public for signup/count and admin-managed for lists/settings.
-- Keep table/function grants aligned with the RLS policies that enforce row access.
GRANT INSERT ON public.blind_draw_signups TO anon, authenticated;
GRANT SELECT, DELETE ON public.blind_draw_signups TO authenticated;

GRANT SELECT ON public.blind_draw_settings TO anon, authenticated;
GRANT UPDATE ON public.blind_draw_settings TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_blind_draw_signup_count(date) TO anon, authenticated;
