
-- Create categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text UNIQUE NOT NULL,
  label text NOT NULL,
  sort_order integer DEFAULT 0,
  visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- SELECT for everyone
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);

-- Admin-only write
CREATE POLICY "Admin can insert categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can update categories" ON public.categories
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can delete categories" ON public.categories
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text));

-- Seed initial data
INSERT INTO public.categories (value, label, sort_order, visible) VALUES
  ('tortas', 'Tortas', 0, true),
  ('cookies', 'Cookies', 1, true),
  ('boxes', 'Boxes', 2, true),
  ('postres_individuales', 'Postres individuales', 3, true),
  ('mesa_dulce', 'Mesa dulce', 4, true);
