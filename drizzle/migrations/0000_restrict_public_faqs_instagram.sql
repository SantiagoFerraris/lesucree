DROP POLICY IF EXISTS "FAQs are viewable by everyone" ON public.faqs;
CREATE POLICY "Active FAQs are viewable by everyone" ON public.faqs FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'::text));
DROP POLICY IF EXISTS "Instagram posts are viewable by everyone" ON public.instagram_posts;
CREATE POLICY "Active instagram posts are viewable by everyone" ON public.instagram_posts FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'::text));