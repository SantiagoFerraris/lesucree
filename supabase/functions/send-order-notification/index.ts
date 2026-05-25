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

const GENERIC_OK = () => new Response(JSON.stringify({ success: true }), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const BodySchema = z.object({ orderId: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Internal-only: require service-role bearer token (set by trusted edge functions).
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') || '';
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return GENERIC_OK();
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      // Generic response to prevent enumeration of valid order IDs.
      return GENERIC_OK();
    }
    const { orderId } = parsed.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch ALL order fields from the database. Never trust the caller for PII.
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, customer_name, customer_phone, customer_email, desired_date, preferred_time, notes, items, total, notified_at')
      .eq('id', orderId)
      .maybeSingle();

    // Generic response whether or not the order exists / was already notified.
    if (!order || order.notified_at) {
      return GENERIC_OK();
    }

    const NOTIFICATION_EMAIL = Deno.env.get('ORDER_NOTIFICATION_EMAIL');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!NOTIFICATION_EMAIL) {
      console.error('ORDER_NOTIFICATION_EMAIL not configured');
      return GENERIC_OK();
    }

    const dbItems: any[] = (order.items as any[]) || [];
    const dbTotal = Number(order.total ?? 0);
    const shortId = String(order.id).slice(0, 8).toUpperCase();

    const itemsHtml = dbItems.map((i: any) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(i.productName)}${i.variantLabel ? ` — ${escapeHtml(i.variantLabel)}` : ''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${escapeHtml(String(i.quantity))}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(Number(i.unitPrice) * Number(i.quantity)).toLocaleString('es-AR')}</td></tr>`
    ).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#3E2723;font-size:24px">Nuevo Pedido #${escapeHtml(shortId)}</h1>
        <h3 style="color:#6D5D53">Datos del cliente</h3>
        <p><strong>Nombre:</strong> ${escapeHtml(String(order.customer_name))}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(String(order.customer_phone))}</p>
        <p><strong>Email:</strong> ${escapeHtml(String(order.customer_email))}</p>
        <p><strong>Fecha de retiro:</strong> ${escapeHtml(String(order.desired_date))}</p>
        <p><strong>Horario:</strong> ${escapeHtml(String(order.preferred_time))}</p>
        ${order.notes ? `<p><strong>Notas:</strong> ${escapeHtml(String(order.notes))}</p>` : ''}
        <h3 style="color:#6D5D53;margin-top:20px">Productos</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#F5E6DA"><th style="padding:8px;text-align:left">Producto</th><th style="padding:8px;text-align:center">Cant.</th><th style="padding:8px;text-align:right">Precio</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p style="font-size:18px;font-weight:bold;color:#3E2723;margin-top:16px;text-align:right">Total: $${dbTotal.toLocaleString('es-AR')}</p>
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
          from: 'Le Sucrée <onboarding@resend.dev>',
          to: [NOTIFICATION_EMAIL],
          subject: `Nuevo Pedido #${shortId} - Le Sucrée`,
          html,
        }),
      });

      if (!resendRes.ok) {
        const errBody = await resendRes.text();
        console.error('Resend API error:', resendRes.status, errBody);
        return GENERIC_OK();
      }

      console.log('Email sent successfully via Resend to', NOTIFICATION_EMAIL);
    } else {
      console.log('RESEND_API_KEY not set. Order notification logged for', shortId);
    }

    await supabaseAdmin.from('orders').update({ notified_at: new Date().toISOString() }).eq('id', order.id);

    return GENERIC_OK();
  } catch (error) {
    console.error('Edge function error:', error);
    return GENERIC_OK();
  }
});
