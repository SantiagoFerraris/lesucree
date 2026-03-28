
-- Add admin-only SELECT policy to rate_limits table
CREATE POLICY "Admin can view rate limits"
  ON public.rate_limits
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text));

-- Add notified_at column to orders and contact_messages for one-time notification guard
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notified_at timestamptz DEFAULT NULL;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS notified_at timestamptz DEFAULT NULL;
