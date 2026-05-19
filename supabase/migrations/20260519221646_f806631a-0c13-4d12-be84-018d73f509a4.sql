CREATE TABLE IF NOT EXISTS public.coupon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_products_coupon ON public.coupon_products(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_products_product ON public.coupon_products(product_id);

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS zumbita_request_id uuid;
CREATE INDEX IF NOT EXISTS idx_coupons_zumbita_request ON public.coupons(zumbita_request_id);

ALTER TABLE public.coupon_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view coupon_products of active coupons"
ON public.coupon_products FOR SELECT
TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.coupons c WHERE c.id = coupon_products.coupon_id AND c.is_active = true));

CREATE POLICY "Admin can insert coupon_products"
ON public.coupon_products FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can update coupon_products"
ON public.coupon_products FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can delete coupon_products"
ON public.coupon_products FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::text));