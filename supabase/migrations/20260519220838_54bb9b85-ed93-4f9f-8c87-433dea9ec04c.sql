-- Extend existing promotions table with new fields (keep legacy columns for backward compat)
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_text text;

-- Relax legacy NOT NULL constraints so new rows don't require them
ALTER TABLE public.promotions ALTER COLUMN day_of_week DROP NOT NULL;
ALTER TABLE public.promotions ALTER COLUMN name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON public.promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON public.promotions(start_date, end_date);

-- ============================================================
-- promotion_products (join table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promotion_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(promotion_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_products_promotion ON public.promotion_products(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_products_product ON public.promotion_products(product_id);

ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view promotion_products of active promotions"
  ON public.promotion_products FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.is_active = true));

CREATE POLICY "Admin can insert promotion_products"
  ON public.promotion_products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can update promotion_products"
  ON public.promotion_products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can delete promotion_products"
  ON public.promotion_products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text));

-- ============================================================
-- zumbita_discount_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.zumbita_discount_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  message text,
  is_zumbita_student boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT zumbita_status_check CHECK (status IN ('pending','approved','rejected','disabled'))
);

CREATE INDEX IF NOT EXISTS idx_zumbita_status ON public.zumbita_discount_requests(status);
CREATE INDEX IF NOT EXISTS idx_zumbita_created_at ON public.zumbita_discount_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zumbita_email ON public.zumbita_discount_requests(email);

ALTER TABLE public.zumbita_discount_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a zumbita request"
  ON public.zumbita_discount_requests FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Admin can view zumbita requests"
  ON public.zumbita_discount_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can update zumbita requests"
  ON public.zumbita_discount_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can delete zumbita requests"
  ON public.zumbita_discount_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text));

-- ============================================================
-- coupons
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL,
  expiration_date timestamptz,
  max_uses integer,
  minimum_purchase_amount numeric NOT NULL DEFAULT 0,
  single_use boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_discount_type_check CHECK (discount_type IN ('percentage','fixed'))
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_expiration ON public.coupons(expiration_date);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active coupons"
  ON public.coupons FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admin can insert coupons"
  ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can update coupons"
  ON public.coupons FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can delete coupons"
  ON public.coupons FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text));

-- ============================================================
-- coupon_usage
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  customer_id text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON public.coupon_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer ON public.coupon_usage(customer_id);

ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record coupon usage"
  ON public.coupon_usage FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Admin can view coupon usage"
  ON public.coupon_usage FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can delete coupon usage"
  ON public.coupon_usage FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text));