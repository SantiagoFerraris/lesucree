-- 1. Remove the old CHECK constraint on products.category (no-op if already gone)
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_check;

-- 2. Add foreign key from products.category to categories(value)
ALTER TABLE public.products
  ADD CONSTRAINT products_category_fk
  FOREIGN KEY (category) REFERENCES public.categories(value)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- 3. Seed categories that might not exist yet (no-op if they already do)
INSERT INTO public.categories (value, label, sort_order, visible)
VALUES
  ('tortas', 'Tortas', 0, true),
  ('cookies', 'Cookies', 1, true),
  ('boxes', 'Boxes', 2, true),
  ('postres_individuales', 'Individuales', 3, true),
  ('tartas', 'Tartas', 5, true),
  ('budines', 'Budines', 6, true),
  ('alfajorcitos', 'Alfajores', 7, true),
  ('tortas_personalizadas', 'Tortas Personalizadas', 8, true),
  ('bares', 'Bares', 9, true),
  ('bares_cookies', 'Bares Cookies-Alfajores', 10, true),
  ('macarons', 'Macarons', 11, true),
  ('da_del_padre', 'Día del Padre', 12, true)
ON CONFLICT (value) DO NOTHING;