
-- Create admin role check function
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS on user_roles: only admins can see roles
CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- product_variants table
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  price numeric NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view variants of active products" ON public.product_variants
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND active = true)
  );

CREATE POLICY "Authenticated can view all variants" ON public.product_variants
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert variants" ON public.product_variants
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update variants" ON public.product_variants
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete variants" ON public.product_variants
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text NOT NULL,
  desired_date date NOT NULL,
  preferred_time text NOT NULL,
  notes text,
  items jsonb NOT NULL,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can place an order" ON public.orders
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admin can view orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete orders" ON public.orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix existing RLS policies on products to use admin role
DROP POLICY IF EXISTS "Authenticated can view all products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can delete products" ON public.products;

CREATE POLICY "Admin can view all products" ON public.products
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update products" ON public.products
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete products" ON public.products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix existing RLS policies on contact_messages to use admin role
DROP POLICY IF EXISTS "Authenticated can read messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Authenticated can delete messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Authenticated can update messages" ON public.contact_messages;

CREATE POLICY "Admin can read messages" ON public.contact_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete messages" ON public.contact_messages
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update messages" ON public.contact_messages
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix storage policies for product-images bucket
DROP POLICY IF EXISTS "Anyone can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete product images" ON storage.objects;

CREATE POLICY "Public can view product images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'product-images');

CREATE POLICY "Admin can upload product images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin can update product images" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin can delete product images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin')
  );
