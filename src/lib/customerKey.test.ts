import { describe, it, expect } from 'vitest';
import { getCustomerKey, cleanEmail } from './customerKey';

describe('getCustomerKey', () => {
  it('uses normalized phone first', () => {
    expect(getCustomerKey({ id: 1, customer_name: 'Ana', customer_phone: '+54 (341) 555-1234', customer_email: 'a@x.com' })).toBe('phone:543415551234');
  });
  it('falls back to non-generic email, lowercased', () => {
    expect(getCustomerKey({ id: 1, customer_name: 'Ana', customer_email: ' A@X.com ' })).toBe('email:a@x.com');
  });
  it('skips generic emails and uses lowercase name', () => {
    expect(getCustomerKey({ id: 1, customer_name: ' Ana Pérez ', customer_email: 'importado@lesucree.com' })).toBe('name:ana pérez');
  });
  it('uses unique id fallback when nothing else', () => {
    expect(getCustomerKey({ id: 'abc', customer_email: 'manual@lesucree.com' })).toBe('unknown:abc');
  });
  it('cleanEmail blanks generic emails', () => {
    expect(cleanEmail('manual@lesucree.com')).toBe('');
    expect(cleanEmail('real@x.com')).toBe('real@x.com');
  });
});
