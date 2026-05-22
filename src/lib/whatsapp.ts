import { toast } from 'sonner';

/**
 * Normalize a phone number to digits-only and ensure Argentine 549 prefix.
 * Returns empty string for invalid/empty input.
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  // Strip leading zeros
  digits = digits.replace(/^0+/, '');
  if (digits.startsWith('549')) return digits;
  if (digits.startsWith('54')) return `549${digits.slice(2)}`;
  // Local AR mobile (10 digits starting with 2/3) — prepend 549
  if (/^[23]\d{9}$/.test(digits)) return `549${digits}`;
  // Default: prepend 549 if not already country-coded
  if (digits.length <= 11) return `549${digits}`;
  return digits;
}

/**
 * Build a wa.me link. If no message, omits ?text=. Returns null if phone is invalid.
 */
export function getWhatsAppLink(phone: string | null | undefined, message?: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized || normalized.length < 10) return null;
  const base = `https://wa.me/${normalized}`;
  const msg = message?.trim();
  if (!msg) return base;
  return `${base}?text=${encodeURI(msg)}`;
}

/**
 * Open WhatsApp in a new tab. Shows a Spanish error toast if phone is invalid.
 * Returns true if opened, false otherwise.
 */
export function openWhatsApp(phone: string | null | undefined, message?: string): boolean {
  const url = getWhatsAppLink(phone, message);
  if (!url) {
    toast.error('No se pudo generar el enlace de WhatsApp');
    return false;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
