import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import { CATEGORIES } from '@/lib/constants';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function Catalogo() {
  const [category, setCategory] = useState('todos');
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
                className={`whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.06em] transition-all duration-300 active:scale-95 ${
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
              <ProductCard key={p.id} product={p} index={reveal.isVisible ? i : -1} />
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
    </section>
  );
}
