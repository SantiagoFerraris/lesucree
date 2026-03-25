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
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const hasVariants = variants && variants.length > 0;
  const selectedVariant = hasVariants ? variants[selectedVariantIndex] : undefined;
  const displayPrice = selectedVariant?.price ?? product.price;

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
      </div>
    </div>
  );
}