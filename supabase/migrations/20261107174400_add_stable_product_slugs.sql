ALTER TABLE public.products ADD COLUMN slug text;
ALTER TABLE public.products ADD CONSTRAINT products_slug_unique UNIQUE (slug);

CREATE FUNCTION public.assign_product_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.slug IS NOT NULL THEN
    NEW.slug := OLD.slug;
    RETURN NEW;
  END IF;
  base_slug := trim(both '-' from regexp_replace(lower(translate(NEW.name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')), '[^a-z0-9]+', '-', 'g'));
  IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'producto'; END IF;
  NEW.slug := base_slug || '-' || NEW.id::text;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_product_slug() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER products_stable_slug BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.assign_product_slug();
UPDATE public.products SET slug = NULL WHERE slug IS NULL;
COMMENT ON COLUMN public.products.slug IS 'Name-derived URL slug with UUID suffix for collision-free creation; immutable after assignment.';