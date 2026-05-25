-- Enable RLS on order_payments and add admin-only policies
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view order payments"
ON public.order_payments FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can insert order payments"
ON public.order_payments FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can update order payments"
ON public.order_payments FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admin can delete order payments"
ON public.order_payments FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::text));

-- Convert the two remaining views to SECURITY INVOKER so RLS of caller is honored
ALTER VIEW public.vista_deuda_pedidos SET (security_invoker = true);
ALTER VIEW public.vista_estadisticas_cobranza SET (security_invoker = true);