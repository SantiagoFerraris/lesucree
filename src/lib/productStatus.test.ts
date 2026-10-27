import { describe, it, expect } from 'vitest';
import { getProductStatus, getProductStatusBehavior, isPubliclyVisible } from './productStatus';

describe('productStatus', () => {
  it('defaults unknown/missing status to activo', () => {
    expect(getProductStatus({})).toBe('activo');
    expect(getProductStatus({ status: 'raro' })).toBe('activo');
    expect(getProductStatus({ status: 'agotado' })).toBe('agotado');
  });
  it('agotado and proximamente block cart', () => {
    expect(getProductStatusBehavior({ status: 'agotado' }).canAddToCart).toBe(false);
    const p = getProductStatusBehavior({ status: 'proximamente' });
    expect(p.canAddToCart).toBe(false);
    expect(p.showPrice).toBe(false);
  });
  it('customizable only overrides activo', () => {
    expect(getProductStatusBehavior({ status: 'activo' }, true).canAddToCart).toBe(true);
    expect(getProductStatusBehavior({ status: 'agotado' }, true).canAddToCart).toBe(false);
  });
  it('visibility requires non-oculto and active !== false', () => {
    expect(isPubliclyVisible({ status: 'activo', active: true })).toBe(true);
    expect(isPubliclyVisible({ status: 'oculto', active: true })).toBe(false);
    expect(isPubliclyVisible({ status: 'activo', active: false })).toBe(false);
    expect(isPubliclyVisible({ status: 'agotado', active: null })).toBe(true);
  });
});
