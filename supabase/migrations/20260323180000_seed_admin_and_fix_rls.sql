-- Seed admin user in Supabase Auth and assign admin role
-- This creates the admin user if it doesn't already exist

-- Step 1: Create the admin user in auth.users using Supabase's internal function
-- We use a DO block so it's idempotent (won't fail if user already exists)
DO $$
DECLARE
  _uid uuid;
  BEGIN
    -- Check if user already exists
      SELECT id INTO _uid FROM auth.users WHERE email = 'pastelerialesucree@gmail.com';
        
          IF _uid IS NULL THEN
              -- Insert into auth.users
                  INSERT INTO auth.users (
                        id,
                              instance_id,
                                    email,
                                          encrypted_password,
                                                email_confirmed_at,
                                                      created_at,
                                                            updated_at,
                                                                  raw_app_meta_data,
                                                                        raw_user_meta_data,
                                                                              aud,
                                                                                    role,
                                                                                          confirmation_token
                                                                                              ) VALUES (
                                                                                                    gen_random_uuid(),
                                                                                                          '00000000-0000-0000-0000-000000000000',
                                                                                                                'pastelerialesucree@gmail.com',
                                                                                                                      crypt('Lesucree2026*', gen_salt('bf')),
                                                                                                                            now(),
                                                                                                                                  now(),
                                                                                                                                        now(),
                                                                                                                                              '{"provider":"email","providers":["email"]}',
                                                                                                                                                    '{}',
                                                                                                                                                          'authenticated',
                                                                                                                                                                'authenticated',
                                                                                                                                                                      ''
                                                                                                                                                                          )
                                                                                                                                                                              RETURNING id INTO _uid;

                                                                                                                                                                                  -- Also insert into auth.identities
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
                                                                                                                                                                                                                                                      _uid,
                                                                                                                                                                                                                                                            'pastelerialesucree@gmail.com',
                                                                                                                                                                                                                                                                  jsonb_build_object('sub', _uid::text, 'email', 'pastelerialesucree@gmail.com', 'email_verified', true, 'phone_verified', false),
                                                                                                                                                                                                                                                                        'email',
                                                                                                                                                                                                                                                                              now(),
                                                                                                                                                                                                                                                                                    now(),
                                                                                                                                                                                                                                                                                          now()
                                                                                                                                                                                                                                                                                              );
                                                                                                                                                                                                                                                                                                END IF;

                                                                                                                                                                                                                                                                                                  -- Step 2: Insert admin role (idempotent)
                                                                                                                                                                                                                                                                                                    INSERT INTO public.user_roles (user_id, role)
                                                                                                                                                                                                                                                                                                      VALUES (_uid, 'admin')
                                                                                                                                                                                                                                                                                                        ON CONFLICT (user_id, role) DO NOTHING;
                                                                                                                                                                                                                                                                                                        END;
                                                                                                                                                                                                                                                                                                        $$;

                                                                                                                                                                                                                                                                                                        -- Step 3: Fix orders INSERT policy — allow anonymous users to place orders
                                                                                                                                                                                                                                                                                                        -- The current policy uses TO public which should work, but let's also add anon explicitly
                                                                                                                                                                                                                                                                                                        DROP POLICY IF EXISTS "Anyone can place an order" ON public.orders;
                                                                                                                                                                                                                                                                                                        CREATE POLICY "Anyone can place an order" ON public.orders
                                                                                                                                                                                                                                                                                                          FOR INSERT TO anon, authenticated
                                                                                                                                                                                                                                                                                                            WITH CHECK (true);

                                                                                                                                                                                                                                                                                                            -- Step 4: Ensure storage bucket exists and is public
                                                                                                                                                                                                                                                                                                            INSERT INTO storage.buckets (id, name, public)
                                                                                                                                                                                                                                                                                                            VALUES ('product-images', 'product-images', true)
                                                                                                                                                                                                                                                                                                            ON CONFLICT (id) DO UPDATE SET public = true;