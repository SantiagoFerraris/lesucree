import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(100),
});

const OrderSchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerPhone: z.string().trim().min(7).max(20),
  customerEmail: z.string().trim().email().max(255),
  desiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().min(1).max(50),
  notes: z.string().max(1000).optional().default(''),
  items: z.array(OrderItemSchema).min(1).max(50),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = OrderSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { customerName, customerPhone, customerEmail, desiredDate, preferredTime, notes, items } = parsed.data;

    // Validate desired_date is at least 2 days in the future
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    minDate.setHours(0, 0, 0, 0);
    const requestedDate = new Date(desiredDate + 'T00:00:00');
    if (requestedDate < minDate) {
      return new Response(JSON.stringify({ error: 'Desired date must be at least 2 days from now' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting by email
    try { await supabaseAdmin.rpc('cleanup_old_rate_limits'); } catch { /* ignore */ }
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
    await supabaseAdmin.from('rate_limits').insert({ identifier: customerEmail, action_type: 'order' });

    // Fetch real prices server-side
    const productIds = [...new Set(items.map(i => i.productId))];
    const variantIds = items.filter(i => i.variantId).map(i => i.variantId!);

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, price, active')
      .in('id', productIds);

    if (!products || products.length !== productIds.length) {
      return new Response(JSON.stringify({ error: 'One or more products not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inactiveProduct = products.find(p => !p.active);
    if (inactiveProduct) {
      return new Response(JSON.stringify({ error: `Product "${inactiveProduct.name}" is no longer available` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let variants: any[] = [];
    if (variantIds.length > 0) {
      const { data: v } = await supabaseAdmin
        .from('product_variants')
        .select('id, product_id, label, price')
        .in('id', variantIds);
      variants = v || [];
      if (variants.length !== variantIds.length) {
        return new Response(JSON.stringify({ error: 'One or more variants not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const productMap = new Map(products.map(p => [p.id, p]));
    const variantMap = new Map(variants.map(v => [v.id, v]));

    // Build verified order items and compute total
    let serverTotal = 0;
    const orderItems = items.map(item => {
      const product = productMap.get(item.productId)!;
      let unitPrice = product.price;
      let variantLabel: string | null = null;

      if (item.variantId) {
        const variant = variantMap.get(item.variantId)!;
        if (variant.product_id !== item.productId) {
          throw new Error(`Variant does not belong to product`);
        }
        unitPrice = variant.price;
        variantLabel = variant.label;
      }

      serverTotal += unitPrice * item.quantity;

      return {
        productId: item.productId,
        productName: product.name,
        variantLabel,
        quantity: item.quantity,
        unitPrice: Number(unitPrice),
      };
    });

    serverTotal = Math.round(serverTotal * 100) / 100;

    // Insert order with server-computed total
    const orderId = crypto.randomUUID();
    const { error: insertError } = await supabaseAdmin.from('orders').insert({
      id: orderId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      desired_date: desiredDate,
      preferred_time: preferredTime,
      notes: notes || null,
      items: orderItems,
      total: serverTotal,
    });

    if (insertError) {
      console.error('Order insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Server-side notification trigger (no PII in body, only the trusted orderId).
    try {
      await supabaseAdmin.functions.invoke('send-order-notification', {
        body: { orderId },
      });
    } catch (e) {
      console.error('Notification dispatch failed (non-blocking):', e);
    }

    return new Response(JSON.stringify({
      success: true,
      orderId,
      total: serverTotal,
      items: orderItems,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create order error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
