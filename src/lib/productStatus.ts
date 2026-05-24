// Product status — coexists with the legacy `active` boolean during transition.
// Public visibility: status !== 'oculto' AND active === true.

export type ProductStatus = 'activo' | 'agotado' | 'temporada' | 'proximamente' | 'oculto';

export const PRODUCT_STATUS_VALUES: ProductStatus[] = [
  'activo',
  'agotado',
  'temporada',
  'proximamente',
  'oculto',
];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  activo: 'Activo',
  agotado: 'Agotado',
  temporada: 'De temporada',
  proximamente: 'Próximamente',
  oculto: 'Oculto',
};

export interface ProductStatusBehavior {
  /** Render the product in public catalog / detail pages */
  publicVisible: boolean;
  /** Allow "Agregar al carrito" */
  canAddToCart: boolean;
  /** Show price in public UI */
  showPrice: boolean;
  /** Optional badge label shown on the product card (public) */
  publicBadge: string | null;
  /** Tailwind chip classes for admin status pill */
  adminChipClasses: string;
}

export const PRODUCT_STATUS_BEHAVIOR: Record<ProductStatus, ProductStatusBehavior> = {
  activo: {
    publicVisible: true,
    canAddToCart: true,
    showPrice: true,
    publicBadge: null,
    adminChipClasses: 'bg-green-100 text-green-700 border border-green-200',
  },
  agotado: {
    publicVisible: true,
    canAddToCart: false,
    showPrice: true,
    publicBadge: 'Agotado',
    adminChipClasses: 'bg-red-100 text-red-700 border border-red-200',
  },
  temporada: {
    publicVisible: true,
    canAddToCart: true,
    showPrice: true,
    publicBadge: 'De temporada',
    adminChipClasses: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  proximamente: {
    publicVisible: true,
    canAddToCart: false,
    showPrice: false,
    publicBadge: 'Próximamente',
    adminChipClasses: 'bg-blue-100 text-blue-700 border border-blue-200',
  },
  oculto: {
    publicVisible: false,
    canAddToCart: false,
    showPrice: true,
    publicBadge: null,
    adminChipClasses: 'bg-gray-200 text-gray-600 border border-gray-300',
  },
};

export function getProductStatus(p: { status?: string | null }): ProductStatus {
  const s = (p?.status ?? 'activo') as ProductStatus;
  return (PRODUCT_STATUS_VALUES as string[]).includes(s) ? s : 'activo';
}

export function getProductStatusBehavior(p: { status?: string | null }): ProductStatusBehavior {
  return PRODUCT_STATUS_BEHAVIOR[getProductStatus(p)];
}

/** Public visibility check that combines both fields for backwards compatibility. */
export function isPubliclyVisible(p: { status?: string | null; active?: boolean | null }): boolean {
  const behavior = getProductStatusBehavior(p);
  if (!behavior.publicVisible) return false;
  if (p?.active === false) return false;
  return true;
}
