
-- Orders: deposit fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deposit_amount numeric,
  ADD COLUMN IF NOT EXISTS deposit_percentage numeric DEFAULT 50,
  ADD COLUMN IF NOT EXISTS last_payment_date timestamptz,
  ADD COLUMN IF NOT EXISTS is_deposit_confirmed boolean DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS remaining_balance numeric
  GENERATED ALWAYS AS (total - COALESCE(deposit_amount, 0)) STORED;

-- Contact messages: drafts linked to orders
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS is_auto boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_type text;

-- Allow admin to insert drafts (currently only public INSERT exists for contact form)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='contact_messages' AND policyname='Admin can insert messages'
  ) THEN
    CREATE POLICY "Admin can insert messages"
      ON public.contact_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (has_role(auth.uid(), 'admin'::text));
  END IF;
END $$;

-- Site settings defaults for payment configuration
INSERT INTO public.site_settings (key, value) VALUES
  ('pago_alias', ''),
  ('cbu_pago', ''),
  ('direccion_retiro', ''),
  ('horarios', ''),
  ('min_deposit_percentage', '30'),
  ('max_deposit_percentage', '70'),
  ('dias_vencimiento', '3')
ON CONFLICT (key) DO NOTHING;
