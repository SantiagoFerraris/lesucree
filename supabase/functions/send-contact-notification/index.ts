import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.25.76';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Always return the same generic response to prevent enumeration.
const GENERIC_OK = () => new Response(JSON.stringify({ success: true }), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const BodySchema = z.object({ messageId: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return GENERIC_OK();
    }
    const { messageId } = parsed.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the message from DB by id. Never trust caller-supplied PII.
    const { data: msg } = await supabaseAdmin
      .from('contact_messages')
      .select('id, name, email, message, notified_at')
      .eq('id', messageId)
      .maybeSingle();

    if (!msg || msg.notified_at) {
      return GENERIC_OK();
    }

    const NOTIFICATION_EMAIL = Deno.env.get('ORDER_NOTIFICATION_EMAIL');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!NOTIFICATION_EMAIL) {
      console.error('ORDER_NOTIFICATION_EMAIL not configured');
      return GENERIC_OK();
    }

    const now = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#3E2723;font-size:24px;margin-bottom:4px">Nuevo mensaje de contacto</h1>
        <p style="color:#6D5D53;font-size:14px;margin-top:0">Le Sucrée Pastelería</p>
        <hr style="border:none;border-top:1px solid #F5E6DA;margin:20px 0">
        <p><strong style="color:#3E2723">Nombre:</strong> ${escapeHtml(String(msg.name))}</p>
        <p><strong style="color:#3E2723">Email:</strong> <a href="mailto:${escapeHtml(String(msg.email))}" style="color:#D4A69A">${escapeHtml(String(msg.email))}</a></p>
        <p><strong style="color:#3E2723">Mensaje:</strong></p>
        <div style="background:#FDF8F5;padding:16px;border-radius:8px;color:#3E2723;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(String(msg.message))}</div>
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
          subject: `Nuevo mensaje de contacto de ${msg.name}`,
          html,
        }),
      });

      if (!resendRes.ok) {
        const errBody = await resendRes.text();
        console.error('Resend API error:', resendRes.status, errBody);
        return GENERIC_OK();
      }

      console.log('Contact notification sent via Resend to', NOTIFICATION_EMAIL);
    } else {
      console.log('RESEND_API_KEY not set. Contact notification logged for', msg.id);
    }

    await supabaseAdmin.from('contact_messages').update({ notified_at: new Date().toISOString() }).eq('id', msg.id);

    return GENERIC_OK();
  } catch (error) {
    console.error('Contact notification error:', error);
    return GENERIC_OK();
  }
});
