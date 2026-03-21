DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view all products" ON public.products FOR SELECT TO public USING (true);