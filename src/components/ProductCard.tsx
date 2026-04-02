import { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/formatPrice';
import { useCategories, buildCategoryLabels } from '@/hooks/useCategories';
import ProductImage from '@/components/ProductImage';
import { useCart } from '@/contexts/CartContext';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  product: Tables<'products'>;
  index?: number;
  variants?: { id: string; label: string; price: number }[];
  compact?: boolean;
}

export default function ProductCard({ product, index = 0, variants, compact = false }: Props) {
  const { addToCart, setIsOpen } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const { data: categories } = useCategories();
  const categoryLabels = buildCategoryLabels(categories);

  const hasVariants = variants && variants.length > 0;
  const selectedVariant = hasVariants ? variants[selectedVariantIndex] : undefined;
  const displayPrice = selectedVariant?.price ?? product.price;

  // For "Desde $X" display when variants exist
  const minVariantPrice = hasVariants ? Math.min(...variants.map(v => v.price)) : null;

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
      <div className="aspect-[4/3] overflow-hidden">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
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
          <p className="font-body text-base font-semibold text-espresso mt-2">
            {minVariantPrice !== null ? `Desde ${formatPrice(minVariantPrice)}` : formatPrice(product.price)}
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
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
                    selectedVariantIndex === i
                      ? 'bg-blush text-white border border-dusty-pink'
                      : 'bg-white text-dusty-pink border border-dusty-pink/50'
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
            <span className="font-body text-lg font-semibold text-espresso">
              {formatPrice(displayPrice)}
            </span>
            <button
              onClick={handleAdd}
              className={`flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                added
                  ? 'bg-sage text-white'
                  : 'bg-dusty-pink/10 text-dusty-pink hover:bg-dusty-pink hover:text-white'
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
