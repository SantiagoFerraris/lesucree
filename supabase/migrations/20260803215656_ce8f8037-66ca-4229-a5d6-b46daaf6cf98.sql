DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.faqs TO anon;
GRANT SELECT ON public.instagram_posts TO anon;
GRANT SELECT ON public.legal_pages TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT ON public.promotions TO anon;
GRANT SELECT ON public.promotion_products TO anon;
GRANT SELECT ON public.site_settings TO anon;
GRANT INSERT ON public.zumbita_discount_requests TO anon;