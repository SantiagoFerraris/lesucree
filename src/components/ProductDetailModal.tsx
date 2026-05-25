import { useState } from 'react';
import { X, ShoppingBag, Check, Minus, Plus } from 'lucide-react';
import ProductImage from '@/components/ProductImage';
import { WHATSAPP_NUMBER } from '@/lib/constants';
import { getWhatsAppLink } from '@/lib/whatsapp';
import { formatPrice } from '@/lib/formatPrice';
import { useCart } from '@/contexts/CartContext';
import { useActivePromotions, applyBestPromotion } from '@/hooks/useActivePromotions';
import { getProductStatusBehavior } from '@/lib/productStatus';
import type { Tables } from '@/integrations/supabase/types';

interface Variant { id: string; label: string; price: number; sort_order: number; product_id: string; }

export default function ProductDetailModal({ product, variants, onClose }: { product: Tables<'products'>; variants: Variant[]; onClose: () => void }) {
  const hasVariants = variants.length > 0;
  const [selectedVariant, setSelectedVariant] = useState(hasVariants ? variants[0] : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart, setIsOpen } = useCart();
  const promosMap = useActivePromotions();
  const productPromos = promosMap.get(product.id);
  const isCustomizable = (product as any).isCustomizable === true;
  const statusBehavior = getProductStatusBehavior(product as any, isCustomizable);

  const basePrice = selectedVariant?.price ?? product.price;
  const { final: currentPrice, hasDiscount, promo } = applyBestPromotion(basePrice, productPromos);
  const consultText = selectedVariant
    ? `Hola! Quiero consultar por ${product.name} - ${selectedVariant.label}`
    : `Hola! Quiero consultar por ${product.name}`;
  const consultUrl = getWhatsAppLink(WHATSAPP_NUMBER, consultText) ?? '#';

  const handleAdd = () => {
    addToCart({
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      price: currentPrice,
      imageUrl: product.image_url || undefined,
      isCustomizable,
    }, qty);
    setAdded(true);
    setTimeout(() => { setAdded(false); onClose(); setIsOpen(true); }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in p-6 sm:p-4" onClick={onClose}>
      <div className="bg-soft-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden max-h-[85vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <ProductImage src={product.image_url} alt={product.name} className="w-full aspect-[16/10] sm:aspect-[4/3] object-cover" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-espresso hover:bg-white transition-colors active:scale-95" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <span className="text-xs uppercase tracking-[0.08em] font-semibold text-warm-gray">{product.category}</span>
          <h3 className="font-display text-2xl font-bold text-espresso mt-1">{product.name}</h3>
          {product.description && <p className="text-warm-gray mt-3 leading-relaxed">{product.description}</p>}

          {hasVariants && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-warm-gray uppercase tracking-wider mb-2">Tamaño</p>
              <div className="flex flex-wrap gap-2">
                {variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedVariant?.id === v.id ? 'bg-dusty-pink text-white' : 'border border-dusty-pink text-dusty-pink hover:bg-dusty-pink/10'}`}
                  >
                    {v.label} — {formatPrice(v.price)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-baseline gap-3 flex-wrap">
            {isCustomizable ? (
              <p className="text-sm text-dusty-pink italic">Consulta con nosotros el diseño y presupuesto final para tu torta</p>
            ) : statusBehavior.showPrice ? (
              <>
                <p className="font-body text-2xl font-semibold text-espresso">{formatPrice(currentPrice)}</p>
                {hasDiscount && (
                  <>
                    <span className="text-sm text-warm-gray line-through">{formatPrice(basePrice)}</span>
                    <span className="text-[11px] uppercase tracking-[0.1em] font-semibold px-2 py-1 rounded-full bg-dusty-pink/15 text-dusty-pink">
                      {promo?.discount_type === 'percentage' ? `-${promo.discount_value}%` : 'Oferta'}
                    </span>
                  </>
                )}
              </>
            ) : (
              <p className="font-body text-base text-warm-gray italic">Precio a confirmar</p>
            )}
            {statusBehavior.publicBadge && (
              <span className="text-[11px] uppercase tracking-[0.1em] font-semibold px-2 py-1 rounded-full bg-cream text-espresso border border-espresso/20">
                {statusBehavior.publicBadge}
              </span>
            )}
          </div>
          {hasDiscount && promo?.banner_text && (
            <p className="text-xs text-dusty-pink mt-1.5 font-medium">{promo.banner_text}</p>
          )}

          <div className="flex items-center gap-3 mt-4">
            <span className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Cantidad</span>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full border border-warm-gray/30 flex items-center justify-center text-warm-gray hover:border-dusty-pink hover:text-dusty-pink transition-colors">
              <Minus size={14} />
            </button>
            <span className="font-semibold text-espresso w-6 text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-full border border-warm-gray/30 flex items-center justify-center text-warm-gray hover:border-dusty-pink hover:text-dusty-pink transition-colors">
              <Plus size={14} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={handleAdd}
              disabled={!statusBehavior.canAddToCart}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-all active:scale-95 ${
                !statusBehavior.canAddToCart
                  ? 'bg-warm-gray/20 text-warm-gray cursor-not-allowed'
                  : added ? 'bg-sage text-white' : 'bg-dusty-pink text-white hover:bg-mauve'
              }`}
            >
              {added ? <><Check size={16} /> ¡Agregado!</> : <><ShoppingBag size={16} /> {isCustomizable ? 'Continuar Consulta' : 'Agregar al Pedido'}</>}
            </button>
            <a href={consultUrl} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-[#1da851] transition-all active:scale-95">
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
