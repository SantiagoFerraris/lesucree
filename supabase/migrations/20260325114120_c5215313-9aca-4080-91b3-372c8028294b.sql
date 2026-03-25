
-- IMPORTANT: Enable "Leaked Password Protection" in Supabase Dashboard > Authentication > Settings > Security
-- This prevents users from using passwords found in known data breaches.
-- Also set minimum password length to 8 characters in the same settings page.

-- Add last_price_sync column for price sync feature
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_price_sync timestamptz DEFAULT NULL;

-- Recreate has_role function to ensure it exists properly
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role::app_role
  )
$$;

-- ==========================================
-- FIX PRODUCTS TABLE POLICIES
-- ==========================================
-- Drop overly permissive policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to delete products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

-- Drop existing admin policies to recreate them
DROP POLICY IF EXISTS "Admin can insert products" ON products;
DROP POLICY IF EXISTS "Admin can update products" ON products;
DROP POLICY IF EXISTS "Admin can delete products" ON products;
DROP POLICY IF EXISTS "Admin can view all products" ON products;

-- Recreate with proper has_role checks
CREATE POLICY "Admin can view all products" ON products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert products" ON products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update products" ON products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete products" ON products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- FIX PRODUCT_VARIANTS TABLE POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated users to insert variants" ON product_variants;
DROP POLICY IF EXISTS "Allow authenticated users to update variants" ON product_variants;
DROP POLICY IF EXISTS "Allow authenticated users to delete variants" ON product_variants;
DROP POLICY IF EXISTS "Authenticated users can insert variants" ON product_variants;
DROP POLICY IF EXISTS "Authenticated users can update variants" ON product_variants;
DROP POLICY IF EXISTS "Authenticated users can delete variants" ON product_variants;

DROP POLICY IF EXISTS "Admin can insert variants" ON product_variants;
DROP POLICY IF EXISTS "Admin can update variants" ON product_variants;
DROP POLICY IF EXISTS "Admin can delete variants" ON product_variants;
DROP POLICY IF EXISTS "Authenticated can view all variants" ON product_variants;

CREATE POLICY "Authenticated can view all variants" ON product_variants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert variants" ON product_variants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update variants" ON product_variants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete variants" ON product_variants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- FIX ORDERS TABLE POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Anon can read orders for backup" ON orders;
DROP POLICY IF EXISTS "Admin can view orders" ON orders;
DROP POLICY IF EXISTS "Admin can update orders" ON orders;
DROP POLICY IF EXISTS "Admin can delete orders" ON orders;

CREATE POLICY "Admin can view orders" ON orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update orders" ON orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete orders" ON orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- FIX CONTACT_MESSAGES TABLE POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Anon can read messages for backup" ON contact_messages;
DROP POLICY IF EXISTS "Admin can read messages" ON contact_messages;
DROP POLICY IF EXISTS "Admin can update messages" ON contact_messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON contact_messages;

CREATE POLICY "Admin can read messages" ON contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update messages" ON contact_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete messages" ON contact_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- FIX STORAGE POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated users to upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete product images" ON storage.objects;

CREATE POLICY "Admin can upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
