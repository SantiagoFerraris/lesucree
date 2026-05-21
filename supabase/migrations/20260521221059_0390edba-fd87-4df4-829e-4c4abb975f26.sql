
-- 1. Table
CREATE TABLE public.order_payments (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('mercado_pago','efectivo','transferencia')),
  estado VARCHAR(50) NOT NULL DEFAULT 'confirmado' CHECK (estado IN ('confirmado','pendiente_confirmacion')),
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_pago TIME NOT NULL DEFAULT CURRENT_TIME,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notas TEXT
);

-- 2. Indexes
CREATE INDEX idx_payments_order_id ON public.order_payments(order_id);
CREATE INDEX idx_payments_fecha ON public.order_payments(fecha_pago);
CREATE INDEX idx_payments_estado ON public.order_payments(estado);

-- 3. View: vista_deuda_pedidos
CREATE OR REPLACE VIEW public.vista_deuda_pedidos AS
SELECT
  o.id,
  o.customer_name,
  o.customer_email,
  o.customer_phone,
  o.total,
  o.status,
  o.payment_status,
  o.created_at,
  o.desired_date,
  COALESCE(p.total_pagado, 0)::NUMERIC(10,2) AS total_pagado,
  (o.total - COALESCE(p.total_pagado, 0))::NUMERIC(10,2) AS deuda_restante,
  CASE
    WHEN COALESCE(p.total_pagado, 0) >= o.total THEN 'pagado'
    WHEN COALESCE(p.total_pagado, 0) > 0 THEN 'parcial'
    ELSE 'sin_pagar'
  END AS estado_deuda,
  COALESCE(p.cantidad_pagos, 0) AS cantidad_pagos,
  CASE WHEN o.total > 0
       THEN ROUND((COALESCE(p.total_pagado,0) / o.total) * 100, 2)
       ELSE 0
  END AS porcentaje_pagado
FROM public.orders o
LEFT JOIN (
  SELECT order_id, SUM(monto) AS total_pagado, COUNT(*) AS cantidad_pagos
  FROM public.order_payments
  WHERE estado = 'confirmado'
  GROUP BY order_id
) p ON p.order_id = o.id
ORDER BY o.created_at DESC;

-- 4. View: vista_estadisticas_cobranza
CREATE OR REPLACE VIEW public.vista_estadisticas_cobranza AS
SELECT
  COUNT(*) AS total_pedidos,
  COUNT(*) FILTER (WHERE deuda_restante <= 0) AS pedidos_pagos,
  COUNT(*) FILTER (WHERE deuda_restante > 0 AND total_pagado > 0) AS pedidos_parciales,
  COUNT(*) FILTER (WHERE total_pagado = 0) AS pedidos_sin_pagar,
  COALESCE(SUM(total_pagado), 0)::NUMERIC(12,2) AS total_recaudado,
  COALESCE(SUM(GREATEST(deuda_restante, 0)), 0)::NUMERIC(12,2) AS total_pendiente,
  CASE WHEN COALESCE(SUM(total), 0) > 0
       THEN ROUND((SUM(total_pagado) / SUM(total)) * 100, 2)
       ELSE 0
  END AS tasa_cobranza
FROM public.vista_deuda_pedidos
WHERE status <> 'cancelled';

-- 5. Function
CREATE OR REPLACE FUNCTION public.obtener_deuda_pedido(pedido_id_param UUID)
RETURNS TABLE (
  total_pagado NUMERIC,
  deuda_restante NUMERIC,
  completamente_pagado BOOLEAN,
  cantidad_pagos BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
  v_pagado NUMERIC;
  v_count BIGINT;
BEGIN
  SELECT o.total INTO v_total FROM public.orders o WHERE o.id = pedido_id_param;
  SELECT COALESCE(SUM(monto), 0), COUNT(*)
    INTO v_pagado, v_count
    FROM public.order_payments
    WHERE order_id = pedido_id_param AND estado = 'confirmado';

  total_pagado := COALESCE(v_pagado, 0);
  deuda_restante := COALESCE(v_total, 0) - total_pagado;
  completamente_pagado := (total_pagado >= COALESCE(v_total, 0) AND v_total IS NOT NULL);
  cantidad_pagos := v_count;
  RETURN NEXT;
END;
$$;

-- 6. Trigger function + trigger
CREATE OR REPLACE FUNCTION public.actualizar_estado_pago()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC;
  v_pagado NUMERIC;
  v_new_status TEXT;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT total INTO v_total FROM public.orders WHERE id = v_order_id;

  SELECT COALESCE(SUM(monto), 0) INTO v_pagado
  FROM public.order_payments
  WHERE order_id = v_order_id AND estado = 'confirmado';

  IF v_total IS NOT NULL AND v_total <= v_pagado AND v_pagado > 0 THEN
    v_new_status := 'pagado_completo';
  ELSIF v_pagado > 0 THEN
    v_new_status := 'seña_recibida';
  ELSE
    v_new_status := 'pendiente';
  END IF;

  UPDATE public.orders
  SET payment_status = v_new_status
  WHERE id = v_order_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_actualizar_estado_pago
AFTER INSERT OR UPDATE ON public.order_payments
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_estado_pago();
