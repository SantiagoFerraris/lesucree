import { formatPrice } from '@/lib/formatPrice';
import { CATEGORY_LABELS, WHATSAPP_NUMBER } from '@/lib/constants';
import ProductImage from '@/components/ProductImage';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  product: Tables<'products'>;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const consultUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola! Quiero consultar por ${product.name}`)}`;

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
          <span className="font-body text-lg font-semibold text-espresso">{formatPrice(product.price)}</span>
          <a
            href={consultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs uppercase tracking-[0.08em] font-semibold text-dusty-pink hover:text-mauve transition-colors"
          >
            Consultar →
          </a>
        </div>
      </div>
    </div>
  );
}
