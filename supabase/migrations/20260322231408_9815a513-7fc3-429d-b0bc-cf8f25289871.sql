-- Fix RLS policies for products table
DROP POLICY IF EXISTS "Anyone can view all products" ON public.products;
DROP POLICY IF EXISTS "Allow all inserts on products" ON public.products;
DROP POLICY IF EXISTS "Allow all updates on products" ON public.products;
DROP POLICY IF EXISTS "Allow all deletes on products" ON public.products;

-- Products: public can only SELECT active products
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT TO anon USING (active = true);

-- Products: authenticated can do everything
CREATE POLICY "Authenticated can view all products" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update products" ON public.products
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete products" ON public.products
  FOR DELETE TO authenticated USING (true);

-- Fix RLS policies for contact_messages table
DROP POLICY IF EXISTS "Allow reading messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Anyone can send a message" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow deleting messages" ON public.contact_messages;

-- Contact messages: anyone can insert
CREATE POLICY "Anyone can send a message" ON public.contact_messages
  FOR INSERT TO public WITH CHECK (true);

-- Contact messages: only authenticated can read
CREATE POLICY "Authenticated can read messages" ON public.contact_messages
  FOR SELECT TO authenticated USING (true);

-- Contact messages: only authenticated can delete
CREATE POLICY "Authenticated can delete messages" ON public.contact_messages
  FOR DELETE TO authenticated USING (true);

-- Add read column to contact_messages
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;

-- Allow authenticated to update messages (for marking as read)
CREATE POLICY "Authenticated can update messages" ON public.contact_messages
  FOR UPDATE TO authenticated USING (true);