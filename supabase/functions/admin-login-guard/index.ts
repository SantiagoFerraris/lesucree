import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.25.76';
import { corsFor } from '../_shared/cors.ts';

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

const BodySchema = z.object({
  action: z.enum(['check', 'fail', 'reset']),
  email: z.string().trim().max(320).optional(),
});

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ allowed: true });
    const { action } = parsed.data;
    const email = (parsed.data.email || '').toLowerCase();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const identifier = `${ip}|${email}`;
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    try { await admin.rpc('cleanup_old_rate_limits'); } catch { /* ignore */ }

    if (action === 'reset') {
      await admin.from('rate_limits').delete().eq('identifier', identifier).eq('action_type', 'admin_login');
      return json({ allowed: true });
    }

    if (action === 'fail') {
      await admin.from('rate_limits').insert({ identifier, action_type: 'admin_login' });
    }

    const { count } = await admin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .eq('action_type', 'admin_login')
      .gte('created_at', windowStart);

    const failures = count ?? 0;
    if (failures >= MAX_ATTEMPTS) {
      return json({
        allowed: false,
        retryAfterMinutes: WINDOW_MINUTES,
        error: `Demasiados intentos fallidos. Esperá ${WINDOW_MINUTES} minutos e intentá de nuevo.`,
      }, action === 'check' ? 429 : 200);
    }

    // Progressive delay once half the budget is consumed.
    if (failures >= 3) {
      await new Promise((r) => setTimeout(r, (failures - 2) * 1000));
    }

    return json({ allowed: true, remaining: MAX_ATTEMPTS - failures });
  } catch (e) {
    console.error('admin-login-guard error', e);
    // Fail open: never lock a legitimate admin out because of an internal error.
    return json({ allowed: true });
  }
});
