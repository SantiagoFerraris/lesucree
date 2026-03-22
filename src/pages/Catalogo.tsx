import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import ProductImage from '@/components/ProductImage';
import { CATEGORIES, WHATSAPP_NUMBER } from '@/lib/constants';
import { formatPrice } from '@/lib/formatPrice';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import type { Tables } from '@/integrations/supabase/types';

function ProductDetailModal({ product, onClose }: { product: Tables<'products'>; onClose: () => void }) {
  const consultUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola! Quiero consultar por ${product.name}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div className="bg-soft-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <ProductImage src={product.image_url} alt={product.name} className="w-full aspect-[4/3] object-cover" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-espresso hover:bg-white transition-colors active:scale-95"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <span className="text-xs uppercase tracking-[0.08em] font-semibold text-warm-gray">{product.category}</span>
          <h3 className="font-display text-2xl font-bold text-espresso mt-1">{product.name}</h3>
          {product.description && <p className="text-warm-gray mt-3 leading-relaxed">{product.description}</p>}
          <p className="font-body text-2xl font-semibold text-espresso mt-4">{formatPrice(product.price)}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <a
              href={consultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-[#1da851] transition-all active:scale-95"
            >
              Consultar por WhatsApp
            </a>
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-dusty-pink text-dusty-pink px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-dusty-pink hover:text-white transition-all active:scale-95"
            >
              Volver al catálogo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Catalogo() {
  const [category, setCategory] = useState('todos');
  const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
  const reveal = useScrollReveal();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      let q = supabase.from('products').select('*').eq('active', true).order('name');
      if (category !== 'todos') q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="pt-[72px]">
      <div className="py-16 md:py-20 px-4">
        <div className="container">
          <h1 className="font-display text-[32px] md:text-[40px] font-bold text-espresso text-center">
            Nuestro Catálogo
          </h1>
          <p className="text-center text-sm text-warm-gray mt-2">
            Pedidos con 48hs de anticipación — Rosario y Roldán
          </p>

          {/* Category filters */}
          <div className="flex gap-3 mt-10 overflow-x-auto pb-2 justify-start md:justify-center scrollbar-none">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.06em] transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none ${
                  category === c.value
                    ? 'bg-dusty-pink text-white'
                    : 'border border-dusty-pink text-dusty-pink hover:bg-dusty-pink hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Products grid */}
          <div ref={reveal.ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-product animate-pulse">
                <div className="aspect-[4/3] bg-blush" />
                <div className="p-6 space-y-3">
                  <div className="h-3 bg-blush rounded w-1/3" />
                  <div className="h-5 bg-blush rounded w-2/3" />
                  <div className="h-4 bg-blush rounded w-1/4" />
                </div>
              </div>
            ))}
            {products?.map((p, i) => (
              <div key={p.id} onClick={() => setSelectedProduct(p)} className="cursor-pointer">
                <ProductCard product={p} index={reveal.isVisible ? i : -1} />
              </div>
            ))}
          </div>

          {!isLoading && products?.length === 0 && (
            <div className="text-center py-20">
              <p className="text-warm-gray text-lg">Próximamente agregaremos productos.</p>
              <p className="text-warm-gray mt-1">¡Seguinos en Instagram!</p>
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </section>
  );
}
