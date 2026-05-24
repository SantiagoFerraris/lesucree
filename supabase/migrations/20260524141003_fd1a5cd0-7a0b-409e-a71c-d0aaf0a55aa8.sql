ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'pendiente';

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_fulfillment_status_check
  CHECK (fulfillment_status IN ('pendiente', 'confirmado', 'en_preparacion', 'listo', 'retirado', 'cancelado'));