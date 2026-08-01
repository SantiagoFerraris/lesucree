ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.order_payments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_payments TO authenticated;
GRANT ALL ON public.order_payments TO service_role;

DROP POLICY IF EXISTS "Admin can view order payments" ON public.order_payments;
DROP POLICY IF EXISTS "Admin can insert order payments" ON public.order_payments;
DROP POLICY IF EXISTS "Admin can update order payments" ON public.order_payments;
DROP POLICY IF EXISTS "Admin can delete order payments" ON public.order_payments;

CREATE POLICY "Admins can view order payments"
ON public.order_payments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert order payments"
ON public.order_payments FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update order payments"
ON public.order_payments FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete order payments"
ON public.order_payments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));