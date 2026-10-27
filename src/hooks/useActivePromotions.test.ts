import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { applyBestPromotion, type ActivePromotion } from './useActivePromotions';

const promo = (id: string, discount_type: string, discount_value: number): ActivePromotion => ({
  id, title: null, banner_text: null, discount_type, discount_value, show_discount_badge: true, custom_badge_text: null,
});

describe('applyBestPromotion', () => {
  it('returns base price without promos', () => {
    expect(applyBestPromotion(1000, [])).toEqual({ final: 1000, hasDiscount: false, promo: null });
    expect(applyBestPromotion(1000, undefined).hasDiscount).toBe(false);
  });
  it('applies percentage with rounding', () => {
    expect(applyBestPromotion(999, [promo('a', 'percentage', 10)]).final).toBe(899);
  });
  it('picks the cheapest promo', () => {
    const r = applyBestPromotion(10000, [promo('a', 'percentage', 10), promo('b', 'fixed', 2000)]);
    expect(r).toMatchObject({ final: 8000, hasDiscount: true });
    expect(r.promo?.id).toBe('b');
  });
  it('never goes below zero', () => {
    expect(applyBestPromotion(500, [promo('a', 'fixed', 900)]).final).toBe(0);
  });
  it('ignores unknown types and zero price', () => {
    expect(applyBestPromotion(1000, [promo('a', 'bogus', 50)]).hasDiscount).toBe(false);
    expect(applyBestPromotion(0, [promo('a', 'fixed', 10)]).final).toBe(0);
  });
});
