import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import ProductDetailModal from '@/components/ProductDetailModal';
import { useCategories } from '@/hooks/useCategories';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import type { Tables } from '@/integrations/supabase/types';

interface Variant { id: string; label: string; price: number; sort_order: number; product_id: string; }

const ITEMS_PER_PAGE = 9;

export default function Catalogo() {
  const [category, setCategory] = useState('todos');
  const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
  const [page, setPage] = useState(1);
  const reveal = useScrollReveal();
  const gridRef = useRef<HTMLDivElement>(null);

  const { data: dbCategories = [] } = useCategories(true); // only visible
  const filterOptions = [{ value: 'todos', label: 'Todos' }, ...dbCategories.map(c => ({ value: c.value, label: c.label }))];

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      let q = supabase.from('products').select('*').eq('active', true).order('name');
      if (category !== 'todos') q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: allVariants } = useQuery({
    queryKey: ['all-variants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_variants').select('*').order('sort_order');
      if (error) throw error;
      return data as Variant[];
    },
  });

  const getVariants = (productId: string) => allVariants?.filter(v => v.product_id === productId) || [];

  const totalPages = Math.ceil((products?.length || 0) / ITEMS_PER_PAGE);
  const paginatedProducts = products?.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const goToPage = (p: number) => {
    setPage(p);
    if (gridRef.current) {
      const top = gridRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <section className="pt-[72px]">
      <div className="py-10 sm:py-16 md:py-20 px-3 sm:px-4">
        <div className="container">
          <h1 className="font-script text-[28px] sm:text-[36px] md:text-[48px] text-espresso text-center">Nuestro Catálogo</h1>
          <p className="text-center text-sm text-warm-gray mt-2">Pedidos con 48hs de anticipación — Rosario y Roldán</p>

          <div className="flex gap-1.5 sm:gap-2 md:gap-3 mt-6 sm:mt-10 overflow-x-auto pb-2 justify-start md:justify-center scrollbar-hide -mx-1 px-1">
            {filterOptions.map(c => (
              <button
                key={c.value}
                onClick={() => { setCategory(c.value); setPage(1); }}
                aria-pressed={category === c.value}
                className={`whitespace-nowrap rounded-full px-2.5 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-2.5 text-[11px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.06em] transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none ${category === c.value ? 'bg-dusty-pink text-white' : 'border border-dusty-pink text-dusty-pink hover:bg-dusty-pink hover:text-white'}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div ref={gridRef}>
            <div ref={reveal.ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12">
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
              {paginatedProducts?.map((p, i) => (
                <div key={p.id} onClick={() => setSelectedProduct(p)} className="cursor-pointer">
                  <ProductCard product={p} index={reveal.isVisible ? i : -1} variants={getVariants(p.id)} />
                </div>
              ))}
            </div>

            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${page === 1 ? 'border border-dusty-pink/40 text-dusty-pink/40 cursor-not-allowed' : 'border border-dusty-pink text-dusty-pink hover:bg-dusty-pink hover:text-white active:scale-95'}`}
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-10 h-10 rounded-full text-sm font-semibold transition-all active:scale-95 ${p === page ? 'bg-dusty-pink text-white' : 'border border-dusty-pink text-dusty-pink hover:bg-dusty-pink hover:text-white'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${page === totalPages ? 'border border-dusty-pink/40 text-dusty-pink/40 cursor-not-allowed' : 'border border-dusty-pink text-dusty-pink hover:bg-dusty-pink hover:text-white active:scale-95'}`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          {!isLoading && isError && (
            <div className="text-center py-20">
              <p className="text-warm-gray text-lg font-display font-bold text-espresso">Error al cargar los productos. Intentá de nuevo.</p>
              <button
                onClick={() => refetch()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-dusty-pink text-white px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-mauve transition-all active:scale-95"
              >
                <RefreshCw size={16} /> Reintentar
              </button>
            </div>
          )}

          {!isLoading && !isError && products?.length === 0 && (
            <div className="text-center py-20">
              <ShoppingBag size={48} className="mx-auto text-warm-gray/30 mb-4" />
              <p className="text-warm-gray text-lg font-display font-bold text-espresso">No hay productos en esta categoría todavía</p>
              <p className="text-warm-gray mt-2 text-sm">Próximamente agregaremos más opciones. ¡Seguinos en Instagram!</p>
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} variants={getVariants(selectedProduct.id)} onClose={() => setSelectedProduct(null)} />
      )}
    </section>
  );
}
