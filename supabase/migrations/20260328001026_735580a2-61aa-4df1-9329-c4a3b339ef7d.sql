CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL,
  action_type text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits (identifier, action_type, created_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '1 hour';
$$;