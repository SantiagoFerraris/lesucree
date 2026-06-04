export function getTodayArgentina(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function toArgentinaDate(dateInput: string | Date): string {
  if (typeof dateInput === 'string') {
    // Already an ISO date (YYYY-MM-DD) → return as-is to avoid TZ shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
  }
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function daysUntilArgentina(dateInput: string | Date): number {
  const today = getTodayArgentina();
  const targetDate = toArgentinaDate(dateInput);

  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = targetDate.split('-').map(Number);

  const todayDate = new Date(y1, m1 - 1, d1);
  const targetDateObj = new Date(y2, m2 - 1, d2);

  const diffTime = targetDateObj.getTime() - todayDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getPickupLabel(dateInput: string | Date): string {
  const days = daysUntilArgentina(dateInput);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days === 2) return 'En 2 días';
  if (days > 0 && days < 7) return `En ${days} días`;
  return toArgentinaDate(dateInput);
}
