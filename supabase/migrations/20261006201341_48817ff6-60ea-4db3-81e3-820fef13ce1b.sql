ALTER TABLE public.products ADD COLUMN IF NOT EXISTS global_sort_order integer;
WITH o AS (SELECT id, row_number() OVER (ORDER BY created_at, id) * 10 AS rn FROM public.products)
UPDATE public.products p SET global_sort_order = o.rn FROM o WHERE p.id = o.id;