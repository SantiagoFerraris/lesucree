-- Harden RLS policies: restrict write operations to admin role only
-- Previously any authenticated user could modify products and storage objects.
-- This migration ensures only users with 'admin' role in user_roles can write.

-- ============================================
-- HELPER: Create a reusable is_admin() function
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
        SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
              );
              $$;

              -- ============================================
              -- PRODUCTS TABLE: restrict INSERT/UPDATE/DELETE to admin
              -- ============================================
              DROP POLICY IF EXISTS "Authenticated can insert products" ON public.products;
              DROP POLICY IF EXISTS "Authenticated can update products" ON public.products;
              DROP POLICY IF EXISTS "Authenticated can view all products" ON public.products;
              DROP POLICY IF EXISTS "Allow all inserts on products" ON public.products;
              DROP POLICY IF EXISTS "Allow all updates on products" ON public.products;
              DROP POLICY IF EXISTS "Allow all deletes on products" ON public.products;

              -- Public read for active products stays
              -- "Anyone can view active products" already exists from migration 1

              -- Admin-only read (includes inactive products)
              CREATE POLICY "Admin can view all products"
                ON public.products FOR SELECT
                  TO authenticated
                    USING (public.is_admin());

                    -- Admin-only write
                    CREATE POLICY "Admin can insert products"
                      ON public.products FOR INSERT
                        TO authenticated
                          WITH CHECK (public.is_admin());

                          CREATE POLICY "Admin can update products"
                            ON public.products FOR UPDATE
                              TO authenticated
                                USING (public.is_admin());

                                CREATE POLICY "Admin can delete products"
                                  ON public.products FOR DELETE
                                    TO authenticated
                                      USING (public.is_admin());

                                      -- ============================================
                                      -- STORAGE: restrict upload/update/delete to admin
                                      -- ============================================
                                      DROP POLICY IF EXISTS "Anyone can upload product images" ON storage.objects;
                                      DROP POLICY IF EXISTS "Anyone can update product images" ON storage.objects;
                                      DROP POLICY IF EXISTS "Anyone can delete product images" ON storage.objects;

                                      -- Public read stays
                                      -- "Anyone can view product images" already exists

                                      -- Admin-only write for storage
                                      CREATE POLICY "Admin can upload product images"
                                        ON storage.objects FOR INSERT
                                          TO authenticated
                                            WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

                                            CREATE POLICY "Admin can update product images"
                                              ON storage.objects FOR UPDATE
                                                TO authenticated
                                                  USING (bucket_id = 'product-images' AND public.is_admin());

                                                  CREATE POLICY "Admin can delete product images"
                                                    ON storage.objects FOR DELETE
                                                      TO authenticated
                                                        USING (bucket_id = 'product-images' AND public.is_admin());

                                                        -- ============================================
                                                        -- ORDERS TABLE: add CHECK constraints for data validation
                                                        -- ============================================
                                                        ALTER TABLE public.orders
                                                          ADD CONSTRAINT orders_customer_name_length CHECK (char_length(customer_name) <= 200),
                                                            ADD CONSTRAINT orders_customer_phone_length CHECK (char_length(customer_phone) <= 30),
                                                              ADD CONSTRAINT orders_customer_email_length CHECK (char_length(customer_email) <= 320),
                                                                ADD CONSTRAINT orders_notes_length CHECK (char_length(notes) <= 2000);

                                                                -- ============================================
                                                                -- CONTACT_MESSAGES TABLE: add CHECK constraints
                                                                -- ============================================
                                                                ALTER TABLE public.contact_messages
                                                                  ADD CONSTRAINT contact_name_length CHECK (char_length(name) <= 200),
                                                                    ADD CONSTRAINT contact_email_length CHECK (char_length(email) <= 320),
                                                                      ADD CONSTRAINT contact_message_length CHECK (char_length(message) <= 1000);
  )