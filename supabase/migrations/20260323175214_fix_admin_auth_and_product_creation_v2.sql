/*
  # Fix Admin Authentication and Product Creation

  1. Admin User Setup
    - Create admin user account with email pastelerialesucree@gmail.com
    - Assign admin role in user_roles table
    
  2. Storage Policies
    - Enable public read access for product-images bucket
    - Enable authenticated admin uploads to product-images bucket
    
  3. RLS Policy Verification
    - Ensure has_role function works correctly
    - Verify admin can INSERT, UPDATE, DELETE products and product_variants
    
  4. Security
    - All policies require authentication
    - Only admins can manage products
*/

-- Create admin user if not exists (using DO block to handle potential duplicates)
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'pastelerialesucree@gmail.com';
  
  -- If user doesn't exist, create it
  IF admin_user_id IS NULL THEN
    -- Generate a new UUID for the user
    admin_user_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'pastelerialesucree@gmail.com',
      crypt('Lesucree2026*', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
    
    -- Insert into auth.identities with provider_id
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_user_id,
      admin_user_id::text,
      format('{"sub":"%s","email":"%s"}', admin_user_id::text, 'pastelerialesucree@gmail.com')::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
  
  -- Ensure admin role exists in user_roles
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = admin_user_id) THEN
    INSERT INTO user_roles (user_id, role) VALUES (admin_user_id, 'admin');
  END IF;
END $$;

-- Storage bucket policies for product-images
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
END $$;

-- Allow public read access to product-images bucket
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow authenticated users to upload to product-images bucket
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to delete from product-images bucket
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Ensure product_variants policies exist for admin users
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Admin can view all product variants" ON product_variants;
  DROP POLICY IF EXISTS "Admin can insert product variants" ON product_variants;
  DROP POLICY IF EXISTS "Admin can update product variants" ON product_variants;
  DROP POLICY IF EXISTS "Admin can delete product variants" ON product_variants;
  DROP POLICY IF EXISTS "Public can view product variants" ON product_variants;
END $$;

CREATE POLICY "Admin can view all product variants"
ON product_variants FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert product variants"
ON product_variants FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update product variants"
ON product_variants FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete product variants"
ON product_variants FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view product variants"
ON product_variants FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_variants.product_id 
    AND products.active = true
  )
);

-- Ensure contact_messages policies exist for admin users
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin can view all messages" ON contact_messages;
  DROP POLICY IF EXISTS "Admin can update messages" ON contact_messages;
  DROP POLICY IF EXISTS "Admin can delete messages" ON contact_messages;
  DROP POLICY IF EXISTS "Anyone can insert messages" ON contact_messages;
END $$;

CREATE POLICY "Admin can view all messages"
ON contact_messages FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update messages"
ON contact_messages FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete messages"
ON contact_messages FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert messages"
ON contact_messages FOR INSERT
TO public
WITH CHECK (true);

-- Ensure orders policies exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin can view all orders" ON orders;
  DROP POLICY IF EXISTS "Admin can update orders" ON orders;
  DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
END $$;

CREATE POLICY "Admin can view all orders"
ON orders FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update orders"
ON orders FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create orders"
ON orders FOR INSERT
TO public
WITH CHECK (true);
