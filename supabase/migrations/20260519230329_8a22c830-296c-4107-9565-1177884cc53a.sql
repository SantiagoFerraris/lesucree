
ALTER TABLE public.orders ALTER COLUMN customer_email DROP NOT NULL;

ALTER TABLE public.zumbita_discount_requests
  ADD COLUMN IF NOT EXISTS verified_alumna boolean NOT NULL DEFAULT false;
