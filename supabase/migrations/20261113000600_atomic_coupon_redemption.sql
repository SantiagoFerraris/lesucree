CREATE OR REPLACE FUNCTION public.redeem_coupon(_coupon_id uuid, _customer_id text, _order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_uses bigint;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons WHERE id = _coupon_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_uses FROM public.coupon_usage WHERE coupon_id = _coupon_id;
  IF v_coupon.max_uses IS NOT NULL AND v_uses >= v_coupon.max_uses THEN
    RETURN false;
  END IF;

  IF v_coupon.single_use AND EXISTS (
    SELECT 1 FROM public.coupon_usage
    WHERE coupon_id = _coupon_id AND customer_id IS NOT DISTINCT FROM _customer_id
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.coupon_usage (coupon_id, customer_id, order_id)
  VALUES (_coupon_id, _customer_id, _order_id);
  RETURN true;
END;
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION public.redeem_coupon(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(uuid, text, uuid) TO service_role;