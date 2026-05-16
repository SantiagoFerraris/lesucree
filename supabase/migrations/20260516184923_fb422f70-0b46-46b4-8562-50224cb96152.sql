
-- 1. Drop overly permissive anon SELECT policies on PII tables
DROP POLICY IF EXISTS "Anon can read orders" ON public.orders;
DROP POLICY IF EXISTS "Anon can read contact_messages" ON public.contact_messages;

-- 2. Lock down user_roles to prevent privilege escalation
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict Realtime channel subscriptions to admins for sensitive tables
CREATE POLICY "Only admins can subscribe to realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
