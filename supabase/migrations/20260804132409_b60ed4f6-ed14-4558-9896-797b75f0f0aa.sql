DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;

CREATE POLICY "Public can view visible categories"
ON public.categories
FOR SELECT
TO anon
USING (visible = true);

CREATE POLICY "Signed-in users can view categories"
ON public.categories
FOR SELECT
TO authenticated
USING (visible = true OR public.has_role(auth.uid(), 'admin'::text));