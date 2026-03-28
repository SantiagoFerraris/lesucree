
-- Fix security definer views by recreating with security_invoker
CREATE OR REPLACE VIEW public.customer_summary WITH (security_invoker = true) AS
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

CREATE OR REPLACE VIEW public.daily_revenue WITH (security_invoker = true) AS
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

CREATE OR REPLACE VIEW public.product_performance WITH (security_invoker = true) AS
SELECT 
  item->>'productName' as product_name,
  item->>'productId' as product_id,
  COUNT(*) as times_ordered,
  SUM((item->>'quantity')::int) as total_units_sold,
  SUM((item->>'unitPrice')::numeric * (item->>'quantity')::int) as total_revenue
FROM public.orders, jsonb_array_elements(items) as item
WHERE status != 'cancelled'
GROUP BY item->>'productName', item->>'productId';
