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
  it('ignores phone punctuation without digits before considering email', () => {
    expect(getCustomerKey({ id: 2, customer_phone: ' ()- ', customer_email: ' REAL@X.COM ', customer_name: 'Ana' })).toBe('email:real@x.com');
  });
  it.each([' IMPORTADO@LESUCREE.COM ', ' MANUAL@LESUCREE.COM '])('ignores normalized generic email %s', email => {
    expect(getCustomerKey({ id: 3, customer_email: email, customer_name: ' ANA ' })).toBe('name:ana');
  });
  it('keeps unidentified orders separate by their unique ids', () => {
    expect(getCustomerKey({ id: 'first', customer_name: ' ', customer_phone: null })).toBe('unknown:first');
    expect(getCustomerKey({ id: 'second', customer_email: null })).toBe('unknown:second');
  });
});
