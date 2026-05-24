import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function stripHtmlTags(str: string): string {
  return String(str).replace(/<[^>]*>/g, '');
}

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.string().trim().email().max(320).optional()),
  phone: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.string().trim().max(20).optional()),
  message: z.string().trim().min(1).max(1000).transform(stripHtmlTags),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, email, phone, message } = parsed.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Cleanup old rate limit entries
    try { await supabaseAdmin.rpc('cleanup_old_rate_limits'); } catch { /* ignore */ }

    // Rate limiting: max 3 per identifier per 5 minutes (email if provided, else phone, else name)
    const rateIdentifier = email || phone || name;
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', rateIdentifier)
      .eq('action_type', 'contact')
      .gte('created_at', fiveMinAgo);

    if (count !== null && count >= 3) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabaseAdmin.from('rate_limits').insert({ identifier: rateIdentifier, action_type: 'contact' });

    // Insert message
    const { data: msg, error: insertError } = await supabaseAdmin
      .from('contact_messages')
      .insert({ name, email: email ?? null, phone: phone ?? null, message })
      .select('id')
      .single();

    if (insertError) {
      console.error('Contact insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Server-side notification trigger (no PII in body, only the trusted messageId).
    try {
      await supabaseAdmin.functions.invoke('send-contact-notification', {
        body: { messageId: msg.id },
      });
    } catch (e) {
      console.error('Notification dispatch failed (non-blocking):', e);
    }

    return new Response(JSON.stringify({ success: true, messageId: msg.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create contact message error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
