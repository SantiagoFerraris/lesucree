import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(100),
});

const Schema = z.object({
  code: z.string().trim().min(1).max(50),
  customerEmail: z.string().trim().email().max(255).optional().or(z.literal('')),
  customerPhone: z.string().trim().min(4).max(30).optional().or(z.literal('')),
  items: z.array(ItemSchema).min(1).max(50),
});

function normalizePhone(p: string | null | undefined): string {
  return (p || '').replace(/\D/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ valid: false, error: 'Datos inválidos.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { code, customerEmail, customerPhone, items } = parsed.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: coupon } = await admin
      .from('coupons')
      .select('*')
      .ilike('code', code)
      .maybeSingle();

    if (!coupon) return json({ valid: false, error: 'El código no existe.' });
    if (!coupon.is_active) return json({ valid: false, error: 'Este cupón ya no está activo.' });
    if (coupon.expiration_date && new Date(coupon.expiration_date) < new Date()) {
      return json({ valid: false, error: 'Este cupón está vencido.' });
    }

    // Zumbita personal coupon — must match requester's phone or email
    if (coupon.zumbita_request_id) {
      const { data: zReq } = await admin
        .from('zumbita_discount_requests')
        .select('email, whatsapp')
        .eq('id', coupon.zumbita_request_id)
        .maybeSingle();
      const phoneIn = normalizePhone(customerPhone);
      const reqPhone = normalizePhone(zReq?.whatsapp);
      const emailIn = (customerEmail || '').toLowerCase();
      const reqEmail = (zReq?.email || '').toLowerCase();
      const phoneMatches = !!(phoneIn && reqPhone && (phoneIn === reqPhone || phoneIn.endsWith(reqPhone) || reqPhone.endsWith(phoneIn)));
      const emailMatches = !!(emailIn && reqEmail && emailIn === reqEmail);
      if (!phoneMatches && !emailMatches) {
        return json({ valid: false, error: 'Este cupón es personal y no coincide con tus datos' });
      }
    }

    if (coupon.max_uses != null) {
      const { count } = await admin
        .from('coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id);
      if ((count ?? 0) >= coupon.max_uses) return json({ valid: false, error: 'Este cupón alcanzó el límite de usos.' });
    }
    const customerKey = customerEmail || normalizePhone(customerPhone);
    if (coupon.single_use && customerKey) {
      const { count } = await admin
        .from('coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('customer_id', customerKey);
      if ((count ?? 0) > 0) return json({ valid: false, error: 'Ya usaste este cupón anteriormente.' });
    }

    // Compute eligible subtotal (excluding products with active promotion)
    const productIds = [...new Set(items.map(i => i.productId))];
    const variantIds = items.filter(i => i.variantId).map(i => i.variantId!);

    const { data: products } = await admin.from('products').select('id, price, active').in('id', productIds);
    if (!products || products.length !== productIds.length) return json({ valid: false, error: 'Productos inválidos.' });

    let variants: any[] = [];
    if (variantIds.length) {
      const { data: v } = await admin.from('product_variants').select('id, product_id, price').in('id', variantIds);
      variants = v || [];
    }
    const pMap = new Map(products.map(p => [p.id, p]));
    const vMap = new Map(variants.map(v => [v.id, v]));

    const nowIso = new Date().toISOString();
    const { data: promoLinks } = await admin
      .from('promotion_products')
      .select('product_id, promotions!inner(is_active, start_date, end_date, discount_type, discount_value)')
      .in('product_id', productIds);

    const promoProducts = new Set<string>();
    (promoLinks || []).forEach((l: any) => {
      const promos = Array.isArray(l.promotions) ? l.promotions : [l.promotions];
      promos.forEach((p: any) => {
        if (!p?.is_active) return;
        if (p.start_date && p.start_date > nowIso) return;
        if (p.end_date && p.end_date < nowIso) return;
        promoProducts.add(l.product_id);
      });
    });

    const { data: allowed } = await admin.from('coupon_products').select('product_id').eq('coupon_id', coupon.id);
    const allowedSet = new Set((allowed || []).map((r: any) => r.product_id));
    const restricts = allowedSet.size > 0;

    let subtotal = 0;
    let eligible = 0;
    items.forEach(i => {
      const prod = pMap.get(i.productId); if (!prod) return;
      let price = Number(prod.price);
      if (i.variantId) {
        const v = vMap.get(i.variantId); if (v) price = Number(v.price);
      }
      const line = price * i.quantity;
      subtotal += line;
      if (promoProducts.has(i.productId)) return;
      if (restricts && !allowedSet.has(i.productId)) return;
      eligible += line;
    });

    if (eligible <= 0) return json({ valid: false, error: 'Este cupón no aplica a los productos del carrito (algunos ya tienen promoción).' });
    if (coupon.minimum_purchase_amount && subtotal < Number(coupon.minimum_purchase_amount)) {
      return json({ valid: false, error: `Compra mínima de $${Number(coupon.minimum_purchase_amount).toLocaleString('es-AR')} para este cupón.` });
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') discount = Math.round(eligible * (Number(coupon.discount_value) / 100));
    else discount = Math.min(eligible, Math.round(Number(coupon.discount_value)));

    return json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: Number(coupon.discount_value),
      discountAmount: discount,
    });
  } catch (e) {
    console.error('validate-coupon error', e);
    return new Response(JSON.stringify({ valid: false, error: 'Error interno.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  function json(payload: any, status = 200) {
    return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
