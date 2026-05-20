CREATE POLICY "Admin can view coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can view coupon_products"
  ON public.coupon_products FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::text));

ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
ALTER PUBLICATION supabase_realtime DROP TABLE public.contact_messages;