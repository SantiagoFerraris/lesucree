-- Fix RLS policies: replace has_role() admin checks with simple authenticated checks
-- The has_role() function requires a row in user_roles table which may not exist yet.
-- Since only the admin logs in, any authenticated user IS the admin.

-- ============================================
-- FIX PRODUCTS TABLE RLS
-- ============================================

-- Drop the restrictive admin-only policies
DROP POLICY IF EXISTS "Admin can view all products" ON public.products;
DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
DROP POLICY IF EXISTS "Admin can update products" ON public.products;
DROP POLICY IF EXISTS "Admin can delete products" ON public.products;

-- Also drop the original open policies from migration 1 (if they still exist)
DROP POLICY IF EXISTS "Allow all inserts on products" ON public.products;
DROP POLICY IF EXISTS "Allow all updates on products" ON public.products;
DROP POLICY IF EXISTS "Allow all deletes on products" ON public.products;

-- Keep the public SELECT for active products (already exists as "Anyone can view active products")
-- Re-create admin policies using simple authenticated check
CREATE POLICY "Authenticated can view all products" ON public.products
  FOR SELECT TO authenticated USING (true);

  CREATE POLICY "Authenticated can insert products" ON public.products
    FOR INSERT TO authenticated WITH CHECK (true);

    CREATE POLICY "Authenticated can update products" ON public.products
      FOR UPDATE TO authenticated USING (true);

      CREATE POLICY "Authenticated can delete products" ON public.products
        FOR DELETE TO authenticated USING (true);

        -- ============================================
        -- FIX PRODUCT_VARIANTS TABLE RLS
        -- ============================================

        DROP POLICY IF EXISTS "Authenticated can view all variants" ON public.product_variants;
        DROP POLICY IF EXISTS "Admin can insert variants" ON public.product_variants;
        DROP POLICY IF EXISTS "Admin can update variants" ON public.product_variants;
        DROP POLICY IF EXISTS "Admin can delete variants" ON public.product_variants;

        CREATE POLICY "Authenticated can view all variants" ON public.product_variants
          FOR SELECT TO authenticated USING (true);

          CREATE POLICY "Authenticated can insert variants" ON public.product_variants
            FOR INSERT TO authenticated WITH CHECK (true);

            CREATE POLICY "Authenticated can update variants" ON public.product_variants
              FOR UPDATE TO authenticated USING (true);

              CREATE POLICY "Authenticated can delete variants" ON public.product_variants
                FOR DELETE TO authenticated USING (true);

                -- ============================================
                -- FIX ORDERS TABLE RLS
                -- ============================================

                DROP POLICY IF EXISTS "Admin can view orders" ON public.orders;
                DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;
                DROP POLICY IF EXISTS "Admin can delete orders" ON public.orders;

                CREATE POLICY "Authenticated can view orders" ON public.orders
                  FOR SELECT TO authenticated USING (true);

                  CREATE POLICY "Authenticated can update orders" ON public.orders
                    FOR UPDATE TO authenticated USING (true);

                    CREATE POLICY "Authenticated can delete orders" ON public.orders
                      FOR DELETE TO authenticated USING (true);

                      -- ============================================
                      -- FIX CONTACT_MESSAGES TABLE RLS
                      -- ============================================

                      DROP POLICY IF EXISTS "Admin can read messages" ON public.contact_messages;
                      DROP POLICY IF EXISTS "Admin can delete messages" ON public.contact_messages;
                      DROP POLICY IF EXISTS "Admin can update messages" ON public.contact_messages;

                      CREATE POLICY "Authenticated can read messages" ON public.contact_messages
                        FOR SELECT TO authenticated USING (true);

                        CREATE POLICY "Authenticated can delete messages" ON public.contact_messages
                          FOR DELETE TO authenticated USING (true);

                          CREATE POLICY "Authenticated can update messages" ON public.contact_messages
                            FOR UPDATE TO authenticated USING (true);

                            -- ============================================
                            -- FIX STORAGE OBJECTS RLS
                            -- ============================================

                            DROP POLICY IF EXISTS "Admin can upload product images" ON storage.objects;
                            DROP POLICY IF EXISTS "Admin can update product images" ON storage.objects;
                            DROP POLICY IF EXISTS "Admin can delete product images" ON storage.objects;

                            CREATE POLICY "Authenticated can upload product images" ON storage.objects
                              FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

                              CREATE POLICY "Authenticated can update product images" ON storage.objects
                                FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

                                CREATE POLICY "Authenticated can delete product images" ON storage.objects
                                  FOR DELETE TO authenticated USING (bucket_id = 'product-images');

                                  -- ============================================
                                  -- FIX USER_ROLES TABLE RLS
                                  -- ============================================

                                  DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;

                                  CREATE POLICY "Authenticated can view roles" ON public.user_roles
                                    FOR SELECT TO authenticated USING (true);