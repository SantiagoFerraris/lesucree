ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at ASC) * 10 AS rn
  FROM products
)
UPDATE products
  SET sort_order = ranked.rn
  FROM ranked
  WHERE products.id = ranked.id;

CREATE INDEX IF NOT EXISTS products_category_sort_idx
  ON products (category, sort_order);