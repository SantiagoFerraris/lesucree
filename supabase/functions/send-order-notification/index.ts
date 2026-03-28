import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, customerName, customerPhone, customerEmail, desiredDate, preferredTime, notes, items, total } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Cleanup old rate limit entries (non-blocking)
    try { await supabaseAdmin.rpc('cleanup_old_rate_limits'); } catch { /* ignore */ }

    // Server-side rate limiting: max 5 order notifications per email per 10 minutes
    if (customerEmail) {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from('rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('identifier', customerEmail)
        .eq('action_type', 'order')
        .gte('created_at', tenMinAgo);

      if (count !== null && count >= 5) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Record this request
      await supabaseAdmin.from('rate_limits').insert({ identifier: customerEmail, action_type: 'order' });
    }

    // Validate that the order actually exists in the database
    const { data: order } = await supabaseAdmin.from('orders').select('id, notified_at').eq('id', orderId).single();
    let resolvedOrderId = order?.id;

    if (!order) {
      const { data: orderByName } = await supabaseAdmin
        .from('orders')
        .select('id, notified_at')
        .eq('customer_name', customerName)
        .eq('customer_email', customerEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!orderByName) {
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      resolvedOrderId = orderByName.id;

      if (orderByName.notified_at) {
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (order.notified_at) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const NOTIFICATION_EMAIL = Deno.env.get('ORDER_NOTIFICATION_EMAIL');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!NOTIFICATION_EMAIL) {
      console.error('ORDER_NOTIFICATION_EMAIL not configured');
      return new Response(JSON.stringify({ error: 'Email not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const itemsHtml = items.map((i: any) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(i.productName)}${i.variantLabel ? ` — ${escapeHtml(i.variantLabel)}` : ''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${escapeHtml(String(i.quantity))}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(i.unitPrice * i.quantity).toLocaleString('es-AR')}</td></tr>`
    ).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#3E2723;font-size:24px">Nuevo Pedido #${escapeHtml(String(orderId))}</h1>
        <h3 style="color:#6D5D53">Datos del cliente</h3>
        <p><strong>Nombre:</strong> ${escapeHtml(String(customerName))}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(String(customerPhone))}</p>
        <p><strong>Email:</strong> ${escapeHtml(String(customerEmail))}</p>
        <p><strong>Fecha de retiro:</strong> ${escapeHtml(String(desiredDate))}</p>
        <p><strong>Horario:</strong> ${escapeHtml(String(preferredTime))}</p>
        ${notes ? `<p><strong>Notas:</strong> ${escapeHtml(String(notes))}</p>` : ''}
        <h3 style="color:#6D5D53;margin-top:20px">Productos</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#F5E6DA"><th style="padding:8px;text-align:left">Producto</th><th style="padding:8px;text-align:center">Cant.</th><th style="padding:8px;text-align:right">Precio</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p style="font-size:18px;font-weight:bold;color:#3E2723;margin-top:16px;text-align:right">Total: $${total.toLocaleString('es-AR')}</p>
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
          subject: `Nuevo Pedido #${orderId} - Le Sucrée`,
          html: html,
        }),
      });

      if (!resendRes.ok) {
        const errBody = await resendRes.text();
        console.error('Resend API error:', resendRes.status, errBody);
        return new Response(JSON.stringify({ success: true, emailSent: false, reason: 'Resend error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('Email sent successfully via Resend to', NOTIFICATION_EMAIL);
    } else {
      console.log('RESEND_API_KEY not set. Order notification logged:', { orderId, customerName, NOTIFICATION_EMAIL });
    }

    // Mark as notified
    if (resolvedOrderId) {
      await supabaseAdmin.from('orders').update({ notified_at: new Date().toISOString() }).eq('id', resolvedOrderId);
    }

    return new Response(JSON.stringify({ success: true, emailSent: !!RESEND_API_KEY }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
