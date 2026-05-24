ALTER TABLE products
  ADD COLUMN IF NOT EXISTS visible_from timestamptz NULL,
  ADD COLUMN IF NOT EXISTS visible_until timestamptz NULL;