CREATE TABLE public.blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blocked_dates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blocked_dates TO authenticated;
GRANT ALL ON public.blocked_dates TO service_role;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read blocked dates" ON public.blocked_dates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert blocked dates" ON public.blocked_dates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update blocked dates" ON public.blocked_dates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete blocked dates" ON public.blocked_dates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Returns only whether a date reached capacity; exposes no order data.
CREATE OR REPLACE FUNCTION public.is_date_full(_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN COALESCE(NULLIF(trim((SELECT value FROM public.site_settings WHERE key = 'max_orders_per_day')), ''), '') !~ '^\d+$' THEN false
    ELSE (SELECT count(*) FROM public.orders WHERE desired_date = _date AND status <> 'cancelled')
         >= (SELECT trim(value)::int FROM public.site_settings WHERE key = 'max_orders_per_day')
  END
$$;
REVOKE ALL ON FUNCTION public.is_date_full(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_date_full(date) TO anon, authenticated, service_role;

INSERT INTO public.site_settings (key, value)
SELECT 'max_orders_per_day', '' WHERE NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'max_orders_per_day');