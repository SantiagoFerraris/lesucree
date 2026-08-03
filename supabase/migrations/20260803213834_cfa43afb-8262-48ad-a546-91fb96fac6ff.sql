-- 1) orders: remove unrestricted public insert; admins keep manual/import inserts.
DROP POLICY IF EXISTS "Anyone can place an order" ON public.orders;
CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::text));
REVOKE INSERT ON public.orders FROM anon;

-- 2) coupon_usage: only edge function (service_role) / admins may write.
DROP POLICY IF EXISTS "Anyone can record coupon usage" ON public.coupon_usage;
CREATE POLICY "Admins can record coupon usage"
  ON public.coupon_usage FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::text));
REVOKE INSERT ON public.coupon_usage FROM anon;

-- 3) zumbita_discount_requests: keep public submissions but constrain fields.
DROP POLICY IF EXISTS "Anyone can submit a zumbita request" ON public.zumbita_discount_requests;
CREATE POLICY "Anyone can submit a zumbita request"
  ON public.zumbita_discount_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND verified_alumna = false
    AND char_length(customer_name) BETWEEN 1 AND 100
    AND (email IS NULL OR char_length(email) <= 255)
    AND (whatsapp IS NULL OR char_length(whatsapp) <= 40)
    AND (message IS NULL OR char_length(message) <= 1000)
  );

-- 4) Storage: stop public listing of buckets; public files stay reachable by URL.
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Instagram images public read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view site images" ON storage.objects;

-- Public site needs to discover hero/historia files only.
CREATE POLICY "Public can read site hero and historia images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'site-images'
    AND (name LIKE 'hero/%' OR name LIKE 'historia/%')
  );

CREATE POLICY "Admins can read managed image buckets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('site-images', 'product-images', 'instagram-images')
    AND has_role(auth.uid(), 'admin'::text)
  );

-- 5) SECURITY DEFINER functions: revoke execute from client roles where not needed.
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.obtener_deuda_pedido(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.actualizar_estado_pago() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_business_insight() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_payment_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;