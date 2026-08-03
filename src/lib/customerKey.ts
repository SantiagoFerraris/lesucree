// Shared customer grouping key logic.
// Used by AdminClientes and insightEngine so grouping never diverges.

export const GENERIC_EMAILS = ['importado@lesucree.com', 'manual@lesucree.com'];

export const cleanEmail = (e?: string | null): string =>
  e && !GENERIC_EMAILS.includes(e.trim().toLowerCase()) ? e : '';

const norm = (s?: string | null) => (s || '').trim().toLowerCase();
const normPhone = (s?: string | null) => (s || '').replace(/\D/g, '');

/**
 * Groups orders by real customer: name → phone → non-generic email → unique fallback.
 */
export function getCustomerKey(o: {
  id?: string | number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
}): string {
  const n = norm(o.customer_name);
  if (n) return `name:${n}`;
  const p = normPhone(o.customer_phone);
  if (p) return `phone:${p}`;
  const e = norm(cleanEmail(o.customer_email));
  if (e) return `email:${e}`;
  return `unknown:${o.id}`;
}
