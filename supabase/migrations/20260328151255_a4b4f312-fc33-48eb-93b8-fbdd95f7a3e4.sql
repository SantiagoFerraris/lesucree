
-- 1. Add payment tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pendiente';

-- Validation trigger for payment_status
CREATE OR REPLACE FUNCTION public.validate_payment_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.payment_status NOT IN ('pendiente', 'seña_recibida', 'pagado_completo') THEN
    RAISE EXCEPTION 'Invalid payment_status: %', NEW.payment_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payment_status
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_status();

-- 2. Create customer_summary view
CREATE OR REPLACE VIEW public.customer_summary AS
SELECT 
  customer_name,
  customer_email,
  customer_phone,
  COUNT(*) as total_orders,
  SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_spent,
  MAX(created_at) as last_order_date,
  MIN(created_at) as first_order_date
FROM public.orders
GROUP BY customer_name, customer_email, customer_phone;

-- 3. Create daily_revenue view
CREATE OR REPLACE VIEW public.daily_revenue AS
SELECT 
  DATE(created_at) as order_date,
  COUNT(*) as order_count,
  SUM(total) as revenue,
  AVG(total) as avg_order_value,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
FROM public.orders
GROUP BY DATE(created_at)
ORDER BY order_date DESC;

-- 4. Create product_performance view
CREATE OR REPLACE VIEW public.product_performance AS
SELECT 
  item->>'productName' as product_name,
  item->>'productId' as product_id,
  COUNT(*) as times_ordered,
  SUM((item->>'quantity')::int) as total_units_sold,
  SUM((item->>'unitPrice')::numeric * (item->>'quantity')::int) as total_revenue
FROM public.orders, jsonb_array_elements(items) as item
WHERE status != 'cancelled'
GROUP BY item->>'productName', item->>'productId';

-- 5. Additional indexes
CREATE INDEX IF NOT EXISTS idx_orders_desired_date ON public.orders(desired_date);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- 6. Business insights table
CREATE TABLE IF NOT EXISTS public.business_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  category text NOT NULL,
  priority text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  action_label text,
  action_route text,
  data_snapshot jsonb,
  is_dismissed boolean DEFAULT false,
  is_read boolean DEFAULT false,
  expires_at timestamptz,
  insight_type text NOT NULL,
  was_acted_on boolean DEFAULT false,
  dismissed_at timestamptz,
  read_at timestamptz
);

CREATE OR REPLACE FUNCTION public.validate_business_insight()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.category NOT IN ('revenue', 'products', 'customers', 'operations', 'growth', 'risk') THEN
    RAISE EXCEPTION 'Invalid category: %', NEW.category;
  END IF;
  IF NEW.priority NOT IN ('critical', 'high', 'medium', 'low') THEN
    RAISE EXCEPTION 'Invalid priority: %', NEW.priority;
  END IF;
  IF NEW.insight_type NOT IN ('alert', 'suggestion', 'trend', 'opportunity', 'warning') THEN
    RAISE EXCEPTION 'Invalid insight_type: %', NEW.insight_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_business_insight
  BEFORE INSERT OR UPDATE ON public.business_insights
  FOR EACH ROW EXECUTE FUNCTION public.validate_business_insight();

CREATE INDEX IF NOT EXISTS idx_insights_active 
  ON public.business_insights(is_dismissed, created_at DESC) 
  WHERE is_dismissed = false;

-- 7. Advisor run log
CREATE TABLE IF NOT EXISTS public.advisor_run_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz DEFAULT now(),
  insights_generated int DEFAULT 0,
  duration_ms int,
  error text
);

-- 8. RLS on new tables
ALTER TABLE public.business_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_run_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view insights" ON public.business_insights FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert insights" ON public.business_insights FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update insights" ON public.business_insights FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete insights" ON public.business_insights FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view run log" ON public.advisor_run_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert run log" ON public.advisor_run_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grant views access
GRANT SELECT ON public.customer_summary TO authenticated;
GRANT SELECT ON public.daily_revenue TO authenticated;
GRANT SELECT ON public.product_performance TO authenticated;
