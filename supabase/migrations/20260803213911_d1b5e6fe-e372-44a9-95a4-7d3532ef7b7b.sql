-- Remove the default PUBLIC execute grant on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obtener_deuda_pedido(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.actualizar_estado_pago() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_business_insight() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_payment_status() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- contact_messages: public writes go through the edge function (service role)
DROP POLICY IF EXISTS "Anyone can send a message" ON public.contact_messages;
CREATE POLICY "Admins can create messages"
  ON public.contact_messages FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::text));
REVOKE INSERT ON public.contact_messages FROM anon;