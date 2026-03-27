import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ShoppingBag, Check, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import ProductImage from '@/components/ProductImage';
import { CATEGORIES, WHATSAPP_NUMBER } from '@/lib/constants';
import { formatPrice } from '@/lib/formatPrice';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useCart } from '@/contexts/CartContext';
import type { Tables } from '@/integrations/supabase/types';

interface Variant { id: string; label: string; price: number; sort_order: number; product_id: string; }

function ProductDetailModal({ product, variants, onClose }: { product: Tables<'products'>; variants: Variant[]; onClose: () => void }) {
    const hasVariants = variants.length > 0;
    const [selectedVariant, setSelectedVariant] = useState(hasVariants ? variants[0] : null);
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);
    const { addToCart, setIsOpen } = useCart();

  const currentPrice = selectedVariant?.price ?? product.price;
    const consultText = selectedVariant
      ? `Hola! Quiero consultar por ${product.name} - ${selectedVariant.label}`
          : `Hola! Quiero consultar por ${product.name}`;
    const consultUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(consultText)}`;

  const handleAdd = () => {
        addToCart({
                productId: product.id,
                productName: product.name,
                variantId: selectedVariant?.id,
                variantLabel: selectedVariant?.label,
                price: currentPrice,
                imageUrl: product.image_url || undefined,
        }, qty);
        setAdded(true);
        setTimeout(() => { setAdded(false); onClose(); setIsOpen(true); }, 800);
  };

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
                <div className="bg-soft-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                          <div className="relative">
                                    <ProductImage src={product.image_url} alt={product.name} className="w-full aspect-[4/3] object-cover" />
                                    <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-espresso hover:bg-white transition-colors active:scale-95" aria-label="Cerrar">
                                                <X size={18} />
                                    </button>button>
                          </div>div>
                        <div className="p-6">
                                  <span className="text-xs uppercase tracking-[0.08em] font-semibold text-warm-gray">{product.category}</span>span>
                                  <h3 className="font-display text-2xl font-bold text-espresso mt-1">{product.name}</h3>h3>
                          {product.description && <p className="text-warm-gray mt-3 leading-relaxed">{product.description}</p>p>}
                          {hasVariants && (
                      <div className="mt-4">
                                    <p className="text-xs font-semibold text-warm-gray uppercase tracking-wider mb-2">Tamaño</p>p>
                                    <div className="flex flex-wrap gap-2">
                                      {variants.map(v => (
                                          <button
                                                                key={v.id}
                                                                onClick={() => setSelectedVariant(v)}
                                                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedVariant?.id === v.id ? 'bg-dusty-pink text-white' : 'border border-dusty-pink text-dusty-pink hover:bg-dusty-pink/10'}`}
                                                              >
                                            {v.label} — {formatPrice(v.price)}
                                          </button>button>
                                        ))}
                                    </div>div>
                      </div>div>
                                  )}
                                  <p className="font-body text-2xl font-semibold text-espresso mt-4">{formatPrice(currentPrice)}</p>p>
                                  <div className="flex items-center gap-3 mt-4">
                                              <span className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Cantidad</span>span>
                                              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full border border-warm-gray/30 flex items-center justify-center text-warm-gray hover:border-dusty-pink hover:text-dusty-pink transition-colors">
                                                            <Minus size={14} />
                                              </button>button>
                                              <span className="font-semibold text-espresso w-6 text-center">{qty}</span>span>
                                              <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-full border border-warm-gray/30 flex items-center justify-center text-warm-gray hover:border-dusty-pink hover:text-dusty-pink transition-colors">
                                                            <Plus size={14} />
                                              </button>button>
                                  </div>div>
                                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                              <button
                                                              onClick={handleAdd}
                                                              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-all active:scale-95 ${added ? 'bg-sage text-white' : 'bg-dusty-pink text-white hover:bg-mauve'}`}
                                                            >
                                                {added ? <><Check size={16} /> ¡Agregado!</>> : <><ShoppingBag size={16} /> Agregar al Pedido</>>}
                                              </button>button>
                                              <a href={consultUrl} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-[#1da851] transition-all active:scale-95">
                                                            Consultar por WhatsApp
                                              </a>a>
                                  </div>div>
                        </div>div>
                </div>div>
        </div>div>
      );
}

const PRODUCTS_PER_PAGE = 6;

export default function Catalogo() {
    const [category, setCategory] = useState('todos');
    const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
    const [page, setPage] = useState(0);
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
  
    const { data: allVariants } = useQuery({
          queryKey: ['all-variants'],
          queryFn: async () => {
                  const { data, error } = await supabase.from('product_variants').select('*').order('sort_order');
                  if (error) throw error;
                  return data as Variant[];
          },
    });
  
    const getVariants = (productId: string) => allVariants?.filter(v => v.product_id === productId) || [];
  
    const totalPages = Math.ceil((products?.length || 0) / PRODUCTS_PER_PAGE);
    const paginatedProducts = products?.slice(page * PRODUCTS_PER_PAGE, (page + 1) * PRODUCTS_PER_PAGE);
  
    const handleCategoryChange = (value: string) => {
          setCategory(value);
          setPage(0);
    };
  
    return (
          <section className="pt-[72px]">
                <div className="py-16 md:py-20 px-4">
                        <div className="container">
                                  <h1 className="font-display text-[32px] md:text-[40px] font-bold text-espresso text-center">Nuestro Catálogo</h1>h1>
                                  <p className="text-center text-sm text-warm-gray mt-2">Pedidos con 48hs de anticipación — Rosario y Roldán</p>p>
                        
                                  <div className="flex gap-3 mt-10 overflow-x-auto pb-2 justify-start md:justify-center scrollbar-none">
                                    {CATEGORIES.map(c => (
                          <button
                                            key={c.value}
                                            onClick={() => handleCategoryChange(c.value)}
                                            className={`whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.06em] transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none ${category === c.value ? 'bg-dusty-pink text-white' : 'border border-dusty-pink text-dusty-pink hover:bg-dusty-pink hover:text-white'}`}
                                          >
                            {c.label}
                          </button>button>
                        ))}
                                  </div>div>
                        
                                  <div ref={reveal.ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                                    {isLoading && Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="card-product animate-pulse">
                                          <div className="aspect-[4/3] bg-blush" />
                                          <div className="p-6 space-y-3">
                                                            <div className="h-3 bg-blush rounded w-1/3" />
                                                            <div className="h-5 bg-blush rounded w-2/3" />
                                                            <div className="h-4 bg-blush rounded w-1/4" />
                                          </div>div>
                          </div>div>
                        ))}
                                    {paginatedProducts?.map((p, i) => (
                          <div key={p.id} onClick={() => setSelectedProduct(p)} className="cursor-pointer">
                                          <ProductCard product={p} index={reveal.isVisible ? i : -1} variants={getVariants(p.id)} />
                          </div>div>
                        ))}
                                  </div>div>
                        
                          {!isLoading && totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-12">
                                      <button
                                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                                        disabled={page === 0}
                                                        className="rounded-full px-6 py-2.5 text-sm font-semibold border border-dusty-pink text-dusty-pink hover:bg-dusty-pink hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-dusty-pink"
                                                      >
                                                      Anterior
                                      </button>button>
                                      <span className="text-sm text-warm-gray font-medium">
                                        {page + 1} / {totalPages}
                                      </span>span>
                                      <button
                                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                                        disabled={page >= totalPages - 1}
                                                        className="rounded-full px-6 py-2.5 text-sm font-semibold border border-dusty-pink text-dusty-pink hover:bg-dusty-pink hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-dusty-pink"
                                                      >
                                                      Siguiente
                                      </button>button>
                        </div>div>
                                  )}
                        
                          {!isLoading && products?.length === 0 && (
                        <div className="text-center py-20">
                                      <p className="text-warm-gray text-lg">Próximamente agregaremos productos.</p>p>
                                      <p className="text-warm-gray mt-1">¡Seguinos en Instagram!</p>p>
                        </div>div>
                                  )}
                        </div>div>
                </div>div>
          
            {selectedProduct && (
                    <ProductDetailModal
                                product={selectedProduct}
                                variants={getVariants(selectedProduct.id)}
                                onClose={() => setSelectedProduct(null)}
                              />
                  )}
          </section>section>
        );
}</></></div>
