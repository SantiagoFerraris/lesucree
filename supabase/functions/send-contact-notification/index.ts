import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Cleanup old rate limit entries (non-blocking)
    try { await supabaseAdmin.rpc('cleanup_old_rate_limits'); } catch { /* ignore */ }

    // Server-side rate limiting: max 3 contact notifications per email per 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', email)
      .eq('action_type', 'contact')
      .gte('created_at', fiveMinAgo);

    if (count !== null && count >= 3) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record this request
    await supabaseAdmin.from('rate_limits').insert({ identifier: email, action_type: 'contact' });

    // Validate message exists in database
    const { data: msg } = await supabaseAdmin
      .from('contact_messages')
      .select('id, notified_at')
      .eq('name', name)
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!msg) {
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // One-time notification guard: skip if already notified
    if (msg.notified_at) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const NOTIFICATION_EMAIL = Deno.env.get('ORDER_NOTIFICATION_EMAIL');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!NOTIFICATION_EMAIL) {
      console.error('ORDER_NOTIFICATION_EMAIL not configured');
      return new Response(JSON.stringify({ error: 'Email not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#3E2723;font-size:24px;margin-bottom:4px">Nuevo mensaje de contacto</h1>
        <p style="color:#6D5D53;font-size:14px;margin-top:0">Le Sucrée Pastelería</p>
        <hr style="border:none;border-top:1px solid #F5E6DA;margin:20px 0">
        <p><strong style="color:#3E2723">Nombre:</strong> ${name}</p>
        <p><strong style="color:#3E2723">Email:</strong> <a href="mailto:${email}" style="color:#D4A69A">${email}</a></p>
        <p><strong style="color:#3E2723">Mensaje:</strong></p>
        <div style="background:#FDF8F5;padding:16px;border-radius:8px;color:#3E2723;font-size:14px;line-height:1.6;white-space:pre-wrap">${message}</div>
        <p style="color:#999;font-size:12px;margin-top:20px">Recibido el ${now}</p>
      </div>
    `;

    if (RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Le Sucrée Pastelería <onboarding@resend.dev>',
          to: [NOTIFICATION_EMAIL],
          subject: `Nuevo mensaje de contacto de ${name}`,
          html,
        }),
      });

      if (!resendRes.ok) {
        const errBody = await resendRes.text();
        console.error('Resend API error:', resendRes.status, errBody);
        return new Response(JSON.stringify({ success: true, emailSent: false, reason: 'Resend error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Contact notification sent via Resend to', NOTIFICATION_EMAIL);
    } else {
      console.log('RESEND_API_KEY not set. Contact notification logged:', { name, email });
    }

    // Mark as notified
    await supabaseAdmin.from('contact_messages').update({ notified_at: new Date().toISOString() }).eq('id', msg.id);

    return new Response(JSON.stringify({ success: true, emailSent: !!RESEND_API_KEY }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contact notification error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
