
CREATE TABLE public.instagram_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  post_url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.instagram_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_posts TO authenticated;
GRANT ALL ON public.instagram_posts TO service_role;

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instagram posts are viewable by everyone"
  ON public.instagram_posts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert instagram posts"
  ON public.instagram_posts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update instagram posts"
  ON public.instagram_posts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete instagram posts"
  ON public.instagram_posts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for the instagram-images bucket (bucket created via tool)
CREATE POLICY "Instagram images public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'instagram-images');

CREATE POLICY "Admins can upload instagram images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'instagram-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update instagram images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'instagram-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'instagram-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete instagram images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'instagram-images' AND public.has_role(auth.uid(), 'admin'));
