ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS show_discount_badge boolean NOT NULL DEFAULT true;
ALTER TABLE public.products DROP COLUMN IF EXISTS show_discount_badge;