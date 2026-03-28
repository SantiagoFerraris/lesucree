-- Performance indexes for production scale
CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products(category, active);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action ON public.rate_limits(identifier, action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

-- Add missing constraints
ALTER TABLE public.orders ADD CONSTRAINT orders_total_positive CHECK (total >= 0);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_variant_per_product'
  ) THEN
    ALTER TABLE public.product_variants ADD CONSTRAINT unique_variant_per_product UNIQUE (product_id, label);
  END IF;
END $$;