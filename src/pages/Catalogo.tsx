import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, ChevronLeft, ChevronRight, RefreshCw, Filter, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import ProductDetailModal from '@/components/ProductDetailModal';
import SEOHead from '@/components/SEOHead';
import { useCategories } from '@/hooks/useCategories';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useActivePromotions } from '@/hooks/useActivePromotions';
import type { Tables } from '@/integrations/supabase/types';

interface Variant { id: string; label: string; price: number; sort_order: number; product_id: string; }

const ITEMS_PER_PAGE = 9;

export default function Catalogo() {
  const { data: settings } = useSiteSettings();
  const seoTitle = settings?.seo_title_catalogo?.trim();
  const seoDesc = settings?.seo_description_catalogo?.trim();
  const [category, setCategory] = useState('todos');
  const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const [overflowCount, setOverflowCount] = useState(0);
  const reveal = useScrollReveal();
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: dbCategories = [] } = useCategories(true); // only visible
  const filterOptions = [{ value: 'todos', label: 'Todos' }, ...dbCategories.map(c => ({ value: c.value, label: c.label }))];

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', category],
    staleTime: 8 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    enabled: !!category,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      let q = supabase
        .from('products')
        .select('id, name, description, price, category, image_url, featured, active, status, is_customizable, sort_order, visible_from, visible_until, urgency_message')
        .eq('active', true)
        .neq('status', 'oculto')
        .or(`visible_from.is.null,visible_from.lte.${nowIso}`)
        .or(`visible_until.is.null,visible_until.gte.${nowIso}`)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(200);
      if (category !== 'todos') q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return data as Tables<'products'>[];
    },
  });

  const { data: allVariants } = useQuery({
    queryKey: ['all-variants'],
    staleTime: 8 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    enabled: true,
    queryFn: async () => {
      const { data, error } = await supabase.from('product_variants').select('*').order('sort_order');
      if (error) throw error;
      return data as Variant[];
    },
  });

  const getVariants = (productId: string) => allVariants?.filter(v => v.product_id === productId) || [];

  // When viewing "todos", surface products with active promotions first (stable for the rest).
  const promosMap = useActivePromotions();
  const sortedProducts = useMemo(() => {
    if (!products) return products;
    if (category !== 'todos') return products;
    const promoted: Tables<'products'>[] = [];
    const regular: Tables<'products'>[] = [];
    products.forEach(p => (promosMap.has(p.id) ? promoted : regular).push(p));
    return [...promoted, ...regular];
  }, [products, category, promosMap]);

  const totalPages = Math.ceil((sortedProducts?.length || 0) / ITEMS_PER_PAGE);
  const paginatedProducts = sortedProducts?.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const goToPage = (p: number) => {
    setPage(p);
    if (gridRef.current) {
      const top = gridRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Detect chip overflow on desktop carousel (for "+N más" toggle)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || chipsExpanded) { setOverflowCount(0); return; }
    const measure = () => {
      const containerRight = el.getBoundingClientRect().right;
      const children = Array.from(el.children) as HTMLElement[];
      let hidden = 0;
      children.forEach(c => {
        if (c.getBoundingClientRect().right > containerRight + 1) hidden++;
      });
      setOverflowCount(hidden);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [filterOptions.length, chipsExpanded]);

  const currentCategoryLabel = (filterOptions.find(o => o.value === category)?.label || 'Todos').toUpperCase();

  // Lock body scroll when mobile filter overlay is open
  useEffect(() => {
    if (mobileFilterOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileFilterOpen]);

  return (
    <section className="pt-[72px]">
      <SEOHead title={seoTitle || "Catálogo de Tortas, Alfajores y Cookies Artesanales | Le Sucrée"} description={seoDesc || "Descubrí nuestro catálogo de pastelería artesanal en Rosario: tortas, alfajores, tartas, budines y cookies hechos a mano."} path="/catalogo" />
      <div className="py-10 sm:py-16 md:py-20 px-3 sm:px-4">
        <div className="container">
          <h1 className="font-script text-[32px] sm:text-[40px] md:text-[52px] text-espresso text-center">Catálogo</h1>
          <p className="text-center text-sm text-warm-gray mt-2">Pedidos con 48hs de anticipación</p>

          {/* Mobile: full-screen filter trigger */}
          <div className="mt-6 sm:hidden">
            <button
              onClick={() => setMobileFilterOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={mobileFilterOpen}
              className="w-full min-h-[44px] flex items-center justify-between gap-2 rounded-full bg-white border border-dusty-pink/40 text-espresso px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none"
            >
              <span className="flex items-center gap-2">
                <Filter size={16} className="text-dusty-pink" />
                <span>FILTRAR — {currentCategoryLabel}</span>
              </span>
              <ChevronDown size={16} className="text-dusty-pink" />
            </button>
          </div>

          {/* Desktop: chip row wraps onto multiple lines, no overflow/scroll/arrows */}
          <div className="mt-6 sm:mt-10 hidden sm:block">
            <div className="flex flex-wrap justify-center gap-2 pb-2 px-1">
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
          </div>

          {/* Mobile full-screen filter overlay (mirrors Navbar mobile menu pattern) */}
          {mobileFilterOpen && (
            <div className="fixed inset-x-0 top-[72px] bottom-0 z-[60] bg-cream sm:hidden animate-fade-in">
              <button
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Cerrar"
                className="absolute top-4 right-4 p-2 text-espresso active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded"
              >
                <X size={24} />
              </button>
              <div className="flex h-full flex-col items-center pt-10 px-6 overflow-y-auto">
                <h2 className="font-script text-[32px] sm:text-[40px] text-espresso text-center">Categorías</h2>
                <div className="flex flex-col items-center gap-5 mt-8 w-full">
                  {filterOptions.map(c => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setCategory(c.value);
                        setPage(1);
                        setTimeout(() => setMobileFilterOpen(false), 200);
                      }}
                      className={`min-h-[44px] nav-link text-lg ${category === c.value ? 'nav-link-active' : ''}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  <ProductCard product={p} index={reveal.isVisible ? i : -1} variants={getVariants(p.id)} categories={dbCategories} activePromotions={promosMap} />
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
