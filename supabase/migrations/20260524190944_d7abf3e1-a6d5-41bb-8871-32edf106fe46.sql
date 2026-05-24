ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS balance_paid_at timestamptz NULL;