import { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import { CATEGORY_LABELS } from '@/lib/constants';
import ProductImage from '@/components/ProductImage';
import { useCart } from '@/contexts/CartContext';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  product: Tables<'products'>;
  index?: number;
  variants?: { id: string; label: string; price: number }[];
}

export default function ProductCard({ product, index = 0, variants }: Props) {
  const { addToCart, setIsOpen } = useCart();
  const [added, setAdded] = useState(false);

  const hasVariants = variants && variants.length > 0;
  const lowestPrice = hasVariants ? Math.min(...variants.map(v => v.price)) : product.price;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const variant = hasVariants ? variants[0] : undefined;
    addToCart({
      productId: product.id,
      productName: product.name,
      variantId: variant?.id,
      variantLabel: variant?.label,
      price: variant?.price ?? product.price,
      imageUrl: product.image_url || undefined,
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setIsOpen(true);
    }, 600);
  };

  return (
    <div
      className="card-product animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="aspect-[4/3] overflow-hidden">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-6">
        <span className="text-xs uppercase tracking-[0.08em] font-semibold text-warm-gray">
          {CATEGORY_LABELS[product.category] || product.category}
        </span>
        <h3 className="font-display text-lg font-bold text-espresso mt-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-warm-gray mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-4">
          <span className="font-body text-lg font-semibold text-espresso">
            {hasVariants ? `Desde ${formatPrice(lowestPrice)}` : formatPrice(product.price)}
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
      </div>
    </div>
  );
}
