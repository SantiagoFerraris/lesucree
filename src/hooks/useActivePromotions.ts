import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivePromotion {
  id: string;
  title: string | null;
  banner_text: string | null;
  discount_type: 'percentage' | 'fixed' | string;
  discount_value: number;
  show_discount_badge: boolean;
}

interface RawPromo extends ActivePromotion {
  promotion_products: { product_id: string }[] | null;
}

/**
 * Fetches currently-active promotions (is_active + within date range)
 * and returns a Map<productId, ActivePromotion[]> for O(1) lookup.
 * Cached and shared across components via react-query.
 */
export function useActivePromotions() {
  const { data } = useQuery({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await (supabase.from('promotions' as any) as any)
        .select('id, title, banner_text, discount_type, discount_value, show_discount_badge, promotion_products(product_id)')
        .eq('is_active', true)
        .lte('start_date', nowIso)
        .gte('end_date', nowIso);
      if (error) {
        console.error('Error loading promotions:', error.message);
        return [] as RawPromo[];
      }
      return (data || []) as RawPromo[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const map = useMemo(() => {
    const m = new Map<string, ActivePromotion[]>();
    (data || []).forEach(p => {
      const promo: ActivePromotion = {
        id: p.id,
        title: p.title,
        banner_text: p.banner_text,
        discount_type: p.discount_type,
        discount_value: Number(p.discount_value) || 0,
      };
      (p.promotion_products || []).forEach(link => {
        const arr = m.get(link.product_id) || [];
        arr.push(promo);
        m.set(link.product_id, arr);
      });
    });
    return m;
  }, [data]);

  return map;
}

/**
 * Apply best discount for a given product price.
 * Returns { final, hasDiscount, promo } — picks the promo that yields the lowest final price.
 */
export function applyBestPromotion(basePrice: number, promos: ActivePromotion[] | undefined) {
  if (!promos || promos.length === 0 || !basePrice) {
    return { final: basePrice, hasDiscount: false, promo: null as ActivePromotion | null };
  }
  let best: { final: number; promo: ActivePromotion } | null = null;
  for (const p of promos) {
    let final = basePrice;
    if (p.discount_type === 'percentage') {
      final = Math.max(0, basePrice * (1 - p.discount_value / 100));
    } else if (p.discount_type === 'fixed') {
      final = Math.max(0, basePrice - p.discount_value);
    }
    final = Math.round(final);
    if (!best || final < best.final) best = { final, promo: p };
  }
  if (!best || best.final >= basePrice) {
    return { final: basePrice, hasDiscount: false, promo: null };
  }
  return { final: best.final, hasDiscount: true, promo: best.promo };
}
