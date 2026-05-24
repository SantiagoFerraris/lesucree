export type FulfillmentStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'retirado'
  | 'cancelado';

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo para retirar',
  retirado: 'Retirado',
  cancelado: 'Cancelado',
};

export const FULFILLMENT_COLORS: Record<FulfillmentStatus, string> = {
  pendiente: 'bg-[#FEF3C7] text-[#92400E]',
  confirmado: 'bg-[#D1FAE5] text-[#065F46]',
  en_preparacion: 'bg-[#E0E7FF] text-[#3730A3]',
  listo: 'bg-[#FCE7F3] text-[#9D174D]',
  retirado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-red-100 text-red-800',
};

export const FULFILLMENT_VALUES: FulfillmentStatus[] = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo',
  'retirado',
  'cancelado',
];
