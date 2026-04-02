
-- Site settings table (key-value store for business config)
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can view site settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

-- Only admin can modify
CREATE POLICY "Admin can insert site settings" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update site settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete site settings" ON public.site_settings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('business_name', 'Le Sucrée'),
  ('whatsapp_number', '5493412741229'),
  ('address', 'Rosario, Santa Fe, Argentina'),
  ('business_hours', 'Mañana: 9:00 - 12:00 / Tarde: 12:00 - 18:00'),
  ('hero_title', 'Le Sucrée'),
  ('hero_subtitle', 'Pastelería'),
  ('hero_text', 'Endulzamos tus momentos con creaciones únicas, hechas con amor y los mejores ingredientes'),
  ('instagram_url', 'https://www.instagram.com/pasteleria.lesucree/'),
  ('instagram_handle', '@pasteleria.lesucree');

-- Storage bucket for site images (hero, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('site-images', 'site-images', true);

-- Anyone can view site images
CREATE POLICY "Anyone can view site images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'site-images');

-- Admin can upload site images
CREATE POLICY "Admin can upload site images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin can update site images
CREATE POLICY "Admin can update site images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin can delete site images
CREATE POLICY "Admin can delete site images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));
