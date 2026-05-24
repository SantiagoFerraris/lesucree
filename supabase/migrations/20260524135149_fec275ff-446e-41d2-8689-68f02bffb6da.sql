ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'activo';

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('activo', 'agotado', 'temporada', 'proximamente', 'oculto'));

UPDATE products
  SET status = CASE WHEN active = false THEN 'oculto' ELSE 'activo' END;