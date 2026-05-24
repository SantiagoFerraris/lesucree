ALTER TABLE products
  ADD COLUMN IF NOT EXISTS urgency_message text NULL;