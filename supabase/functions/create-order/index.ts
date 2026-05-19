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
  couponCode: z.string().trim().min(1).max(50).optional(),
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

    const { customerName, customerPhone, customerEmail, desiredDate, preferredTime, notes, items, couponCode } = parsed.data;

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

    // Fetch active promotions to know which products have promo pricing (no stacking)
    const nowIso = new Date().toISOString();
    const { data: activePromoLinks } = await supabaseAdmin
      .from('promotion_products')
      .select('product_id, promotions!inner(id, is_active, start_date, end_date, discount_type, discount_value)')
      .in('product_id', productIds);

    const productsWithPromo = new Set<string>();
    const promoFinalPriceMap = new Map<string, number>(); // productId -> best promo price
    (activePromoLinks || []).forEach((link: any) => {
      const promos: any[] = Array.isArray(link.promotions) ? link.promotions : [link.promotions];
      promos.forEach((promo: any) => {
        if (!promo?.is_active) return;
        if (promo.start_date && promo.start_date > nowIso) return;
        if (promo.end_date && promo.end_date < nowIso) return;
        productsWithPromo.add(link.product_id);
      });
    });

    // Build verified order items applying promo pricing first
    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = productMap.get(item.productId)!;
      let unitPrice = Number(product.price);
      let variantLabel: string | null = null;
      let hasPromo = false;

      if (item.variantId) {
        const variant = variantMap.get(item.variantId)!;
        if (variant.product_id !== item.productId) {
          throw new Error(`Variant does not belong to product`);
        }
        unitPrice = Number(variant.price);
        variantLabel = variant.label;
      }

      // Apply promotion if exists (best discount)
      if (productsWithPromo.has(item.productId)) {
        let bestPromoPrice = unitPrice;
        (activePromoLinks || []).forEach((link: any) => {
          if (link.product_id !== item.productId) return;
          const promos: any[] = Array.isArray(link.promotions) ? link.promotions : [link.promotions];
          promos.forEach((promo: any) => {
            if (!promo?.is_active) return;
            if (promo.start_date && promo.start_date > nowIso) return;
            if (promo.end_date && promo.end_date < nowIso) return;
            let candidate = unitPrice;
            if (promo.discount_type === 'percentage') candidate = unitPrice * (1 - Number(promo.discount_value) / 100);
            else if (promo.discount_type === 'fixed') candidate = unitPrice - Number(promo.discount_value);
            candidate = Math.max(0, Math.round(candidate));
            if (candidate < bestPromoPrice) bestPromoPrice = candidate;
          });
        });
        if (bestPromoPrice < unitPrice) {
          unitPrice = bestPromoPrice;
          hasPromo = true;
        }
      }

      subtotal += unitPrice * item.quantity;

      return {
        productId: item.productId,
        productName: product.name,
        variantLabel,
        quantity: item.quantity,
        unitPrice,
        hasPromo,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;

    // Validate & apply coupon (no stacking on promo-priced items)
    let couponId: string | null = null;
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .ilike('code', couponCode)
        .maybeSingle();

      if (!coupon) {
        return new Response(JSON.stringify({ error: 'El código de descuento no existe.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!coupon.is_active) {
        return new Response(JSON.stringify({ error: 'Este cupón ya no está activo.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (coupon.expiration_date && new Date(coupon.expiration_date) < new Date()) {
        return new Response(JSON.stringify({ error: 'Este cupón está vencido.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Usage limits
      if (coupon.max_uses != null) {
        const { count: usedCount } = await supabaseAdmin
          .from('coupon_usage')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id);
        if ((usedCount ?? 0) >= coupon.max_uses) {
          return new Response(JSON.stringify({ error: 'Este cupón alcanzó el límite de usos.' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Single-use per customer
      if (coupon.single_use) {
        const { count: prevUse } = await supabaseAdmin
          .from('coupon_usage')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('customer_id', customerEmail);
        if ((prevUse ?? 0) > 0) {
          return new Response(JSON.stringify({ error: 'Ya usaste este cupón anteriormente.' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Allowed products restriction
      const { data: allowed } = await supabaseAdmin
        .from('coupon_products')
        .select('product_id')
        .eq('coupon_id', coupon.id);
      const allowedSet = new Set((allowed || []).map((r: any) => r.product_id));
      const restrictsProducts = allowedSet.size > 0;

      // Eligible amount = items NOT on promo, AND (if restricted) in allowed list
      let eligibleAmount = 0;
      orderItems.forEach(oi => {
        if (oi.hasPromo) return; // no stacking
        if (restrictsProducts && !allowedSet.has(oi.productId)) return;
        eligibleAmount += oi.unitPrice * oi.quantity;
      });

      if (eligibleAmount <= 0) {
        return new Response(JSON.stringify({ error: 'Este cupón no aplica a los productos del carrito (algunos ya tienen promoción activa).' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (coupon.minimum_purchase_amount && subtotal < Number(coupon.minimum_purchase_amount)) {
        return new Response(JSON.stringify({ error: `Compra mínima de $${Number(coupon.minimum_purchase_amount).toLocaleString('es-AR')} para usar este cupón.` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Compute discount on eligible amount only
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.round(eligibleAmount * (Number(coupon.discount_value) / 100));
      } else {
        discountAmount = Math.min(eligibleAmount, Math.round(Number(coupon.discount_value)));
      }
      discountAmount = Math.max(0, discountAmount);
      couponId = coupon.id;
      appliedCouponCode = coupon.code;
    }

    const finalTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

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
      subtotal,
      coupon_id: couponId,
      discount_amount: discountAmount,
      total: finalTotal,
    });

    if (insertError) {
      console.error('Order insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (couponId) {
      await supabaseAdmin.from('coupon_usage').insert({
        coupon_id: couponId,
        customer_id: customerEmail,
        order_id: orderId,
      });
    }

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
      subtotal,
      discountAmount,
      couponCode: appliedCouponCode,
      total: finalTotal,
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
