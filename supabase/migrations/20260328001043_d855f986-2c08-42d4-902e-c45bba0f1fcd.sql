-- Fix: Remove overly permissive anon SELECT policies on orders and contact_messages
DROP POLICY IF EXISTS "Anon can read orders for backup" ON orders;
DROP POLICY IF EXISTS "Anon can read messages for backup" ON contact_messages;

-- Set secure search_path on is_admin function
ALTER FUNCTION public.is_admin() SET search_path = public;

-- The rate_limits table intentionally has no public policies - only service role access
-- The "Anyone can place an order" and "Anyone can send a message" INSERT policies
-- with WITH CHECK (true) are intentional for public form submissions