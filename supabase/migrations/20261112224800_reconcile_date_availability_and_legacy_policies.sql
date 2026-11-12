-- Schema-only reconciliation: no application data is inserted, updated or deleted.
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocked_dates_pkey PRIMARY KEY (id),
  CONSTRAINT blocked_dates_date_key UNIQUE (date)
);

-- Keep public reads, remove unnecessary privileges (including anon writes).
REVOKE ALL PRIVILEGES ON TABLE public.blocked_dates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.blocked_dates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.blocked_dates TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.blocked_dates TO service_role;

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.blocked_dates'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.blocked_dates'::regclass AND attname = 'date')]::smallint[]
  ) THEN
    ALTER TABLE public.blocked_dates ADD CONSTRAINT blocked_dates_date_key UNIQUE (date);
  END IF;
END
$migration$;

DROP POLICY IF EXISTS "Public can read blocked dates" ON public.blocked_dates;
CREATE POLICY "Public can read blocked dates" ON public.blocked_dates
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins insert blocked dates" ON public.blocked_dates;
CREATE POLICY "Admins insert blocked dates" ON public.blocked_dates
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

DROP POLICY IF EXISTS "Admins update blocked dates" ON public.blocked_dates;
CREATE POLICY "Admins update blocked dates" ON public.blocked_dates
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

DROP POLICY IF EXISTS "Admins delete blocked dates" ON public.blocked_dates;
CREATE POLICY "Admins delete blocked dates" ON public.blocked_dates
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));

-- Preserve the live date signature and capacity calculation verbatim.
CREATE OR REPLACE FUNCTION public.is_date_full(_date date)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN COALESCE(NULLIF(trim((SELECT value FROM public.site_settings WHERE key = 'max_orders_per_day')), ''), '') !~ '^\d+$' THEN false
    ELSE (SELECT count(*) FROM public.orders WHERE desired_date = _date AND status <> 'cancelled')
         >= (SELECT trim(value)::int FROM public.site_settings WHERE key = 'max_orders_per_day')
  END
$function$;
REVOKE EXECUTE ON FUNCTION public.is_date_full(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_date_full(date) TO anon, authenticated;

-- Legacy policies are already absent live; retain safe drops for repo consistency.
DROP POLICY IF EXISTS "Authenticated can view orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated can read messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Authenticated can update messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Authenticated can delete messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Authenticated can delete products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can insert variants" ON public.product_variants;
DROP POLICY IF EXISTS "Authenticated can update variants" ON public.product_variants;
DROP POLICY IF EXISTS "Authenticated can delete variants" ON public.product_variants;
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete product images" ON storage.objects;