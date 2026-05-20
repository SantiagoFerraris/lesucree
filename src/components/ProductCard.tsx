import { memo, useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/formatPrice';
import { useCategories, buildCategoryLabels } from '@/hooks/useCategories';
import { useActivePromotions, applyBestPromotion } from '@/hooks/useActivePromotions';
import ProductImage from '@/components/ProductImage';
import { useCart } from '@/contexts/CartContext';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  product: Tables<'products'>;
  index?: number;
  variants?: { id: string; label: string; price: number }[];
  compact?: boolean;
}

function ProductCardImpl({ product, index = 0, variants, compact = false }: Props) {
  const { addToCart, setIsOpen } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const { data: categories } = useCategories();
  const categoryLabels = buildCategoryLabels(categories);
  const promosMap = useActivePromotions();
  const productPromos = promosMap.get(product.id);

  const hasVariants = variants && variants.length > 0;
  const selectedVariant = hasVariants ? variants[selectedVariantIndex] : undefined;
  const basePrice = selectedVariant?.price ?? product.price;
  const { final: displayPrice, hasDiscount, promo } = applyBestPromotion(basePrice, productPromos);

  // For "Desde $X" display when variants exist (use min discounted price)
  const minVariantPrice = hasVariants
    ? Math.min(...variants.map(v => applyBestPromotion(v.price, productPromos).final))
    : null;
  const minVariantOriginal = hasVariants ? Math.min(...variants.map(v => v.price)) : null;

  // Badge label: "-X%" for percentage, "OFERTA" otherwise.
  // Visibility now controlled per-promotion via promotion.show_discount_badge (default true).
  // Only affects visual badge — pricing/promo logic untouched.
  const badgeLabel = (() => {
    const activePromo = promo || (productPromos && productPromos[0]);
    if (!activePromo) return null;
    if (activePromo.show_discount_badge === false) return null;
    if (activePromo.discount_type === 'percentage' && activePromo.discount_value > 0) {
      return `-${Math.round(activePromo.discount_value)}%`;
    }
    return 'OFERTA';
  })();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      price: displayPrice,
      imageUrl: product.image_url || undefined,
    });
    setAdded(true);
    toast.success(`${product.name} agregado al pedido`);
    setTimeout(() => {
      setAdded(false);
      setIsOpen(true);
    }, 600);
  };

  return (
    <div
      className="card-product flex flex-col animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="aspect-[4/3] overflow-hidden relative">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {badgeLabel && (
          <span
            className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-espresso/90 backdrop-blur-sm text-cream text-[10px] font-semibold tracking-[0.1em] uppercase shadow-sm transition-opacity duration-300"
            aria-label={`Producto en oferta ${badgeLabel}`}
          >
            {badgeLabel}
          </span>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <span className="text-xs uppercase tracking-[0.08em] font-semibold text-warm-gray">
          {categoryLabels[product.category] || product.category}
        </span>
        <h3 className="font-display text-lg font-bold text-espresso mt-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-warm-gray mt-1 line-clamp-2">{product.description}</p>
        )}

        {/* Price display — hide "Desde" in compact mode (Nuestros Favoritos) */}
        {!compact && (
          <p className="font-body text-base font-semibold text-espresso mt-2 flex items-baseline gap-2 flex-wrap">
            {minVariantPrice !== null ? (
              <>
                <span className={minVariantOriginal !== null && minVariantPrice < minVariantOriginal ? 'font-bold text-dusty-pink' : ''}>
                  Desde {formatPrice(minVariantPrice)}
                </span>
                {minVariantOriginal !== null && minVariantPrice < minVariantOriginal && (
                  <span className="text-sm text-warm-gray/80 line-through font-medium">{formatPrice(minVariantOriginal)}</span>
                )}
              </>
            ) : (
              <>
                <span className={hasDiscount ? 'font-bold text-dusty-pink' : ''}>{formatPrice(displayPrice)}</span>
                {hasDiscount && (
                  <span className="text-sm text-warm-gray/80 line-through font-medium">{formatPrice(basePrice)}</span>
                )}
              </>
            )}
          </p>
        )}

        {!compact && hasVariants && (
          <div className="mt-3">
            <span className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Tamaño</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {variants.map((v, i) => (
                <button
                  key={v.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedVariantIndex(i); }}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold border-[1.5px] transition-all duration-300 ${
                    selectedVariantIndex === i
                      ? 'bg-espresso text-white border-espresso'
                      : 'border-espresso text-espresso hover:bg-espresso hover:text-white'
                  }`}
                >
                  {v.label} — {formatPrice(v.price)}
                </button>
              ))}
            </div>
          </div>
        )}

        {!compact && (
          <div className="flex items-center justify-between mt-auto pt-4">
            <span className="font-body text-lg font-semibold text-espresso flex items-baseline gap-2">
              <span className={hasDiscount ? 'font-bold text-dusty-pink' : ''}>{formatPrice(displayPrice)}</span>
              {hasDiscount && (
                <span className="text-sm text-warm-gray/80 line-through font-medium">{formatPrice(basePrice)}</span>
              )}
            </span>
            <button
              onClick={handleAdd}
              className={`flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] font-semibold px-5 py-2.5 rounded-full border-[1.5px] transition-all duration-300 active:scale-95 ${
                added
                  ? 'bg-sage text-white border-sage'
                  : 'border-espresso text-espresso hover:bg-espresso hover:text-white'
              }`}
            >
                            {added ? <><Check size={14} /> ¡Agregado!</> : <><ShoppingBag size={14} /> Agregar</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ProductCard = memo(ProductCardImpl);
export default ProductCard;

