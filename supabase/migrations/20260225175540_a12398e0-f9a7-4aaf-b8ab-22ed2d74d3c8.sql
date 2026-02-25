INSERT INTO storage.buckets (id, name, public) VALUES ('hero-cards', 'hero-cards', true);

CREATE POLICY "Anyone can read hero-cards" ON storage.objects
  FOR SELECT USING (bucket_id = 'hero-cards');

CREATE POLICY "Admins can upload hero-cards" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hero-cards' AND public.current_user_is_admin());

CREATE POLICY "Admins can delete hero-cards" ON storage.objects
  FOR DELETE USING (bucket_id = 'hero-cards' AND public.current_user_is_admin());