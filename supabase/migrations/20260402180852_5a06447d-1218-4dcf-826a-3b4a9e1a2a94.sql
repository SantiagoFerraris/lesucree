
-- Create promotions table
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric,
  product_ids uuid[] DEFAULT '{}',
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view promotions" ON public.promotions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert promotions" ON public.promotions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update promotions" ON public.promotions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete promotions" ON public.promotions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create assistant actions log table
CREATE TABLE public.assistant_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  description text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.assistant_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view action log" ON public.assistant_actions_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert action log" ON public.assistant_actions_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add trigger for promotions updated_at
CREATE TRIGGER set_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
