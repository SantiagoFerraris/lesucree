import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/contexts/CartContext';

export async function syncCart(items: CartItem[]) {
  const standardItems = items.filter(item => !item.isCustomizable);
  const productIds = [...new Set(standardItems.map(item => item.productId))];
  const variantIds = [...new Set(standardItems.flatMap(item => item.variantId ? [item.variantId] : []))];
  const [productsResult, variantsResult] = await Promise.all([
    productIds.length
      ? supabase.from('products').select('id, price, active, status').in('id', productIds)
      : Promise.resolve({ data: [], error: null }),
    // Variants have no active/status columns; availability belongs to their product.
    variantIds.length
      ? supabase.from('product_variants').select('id, product_id, price').in('id', variantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (variantsResult.error) throw variantsResult.error;
  const products = new Map((productsResult.data ?? []).map(product => [product.id, product]));
  const variants = new Map((variantsResult.data ?? []).map(variant => [variant.id, variant]));

  return standardItems.map(item => {
    const product = products.get(item.productId);
    const variant = item.variantId ? variants.get(item.variantId) : undefined;
    const unavailable = !product || !product.active || ['oculto', 'agotado'].includes(product.status)
      || (item.variantId != null && (!variant || variant.product_id !== item.productId));
    return {
      productId: item.productId,
      variantId: item.variantId,
      price: unavailable ? null : Number(variant?.price ?? product?.price),
    };
  });
}