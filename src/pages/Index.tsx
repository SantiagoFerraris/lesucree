import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Instagram, Clock, Truck, Heart, X, ShoppingBag, Check, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import SectionDivider from '@/components/SectionDivider';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { WHATSAPP_URL, WHATSAPP_NUMBER, INSTAGRAM_URL, INSTAGRAM_HANDLE } from '@/lib/constants';
import { formatPrice } from '@/lib/formatPrice';
import ProductImage from '@/components/ProductImage';
import { useCart } from '@/contexts/CartContext';
import type { Tables } from '@/integrations/supabase/types';

import tiramisuImg from '@/assets/torta_1_tiramisu.jpg';
import pistachoImg from '@/assets/torta_2_pistacho_chocolate_blanco.jpg';
import pavlovaImg from '@/assets/torta_3_pavlova.jpg';
import petitFoursImg from '@/assets/torta_4_petit_fours.jpg';
import dulceDeLecheImg from '@/assets/torta_5_dulce_de_leche.jpg';
import cookiesImg from '@/assets/torta_6_cookies.jpg';
import chocolateAvellanasImg from '@/assets/torta_7_chocolate_avellanas.jpg';

interface Variant { id: string; label: string; price: number; sort_order: number; product_id: string; }

function HeroSection() {
  return (
    <section className="min-h-[60vh] md:min-h-[70vh] flex items-center justify-center bg-gradient-to-b from-blush to-cream px-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="section-divider mb-8 animate-fade-in-up" />
        <h1 className="font-display text-[32px] md:text-[56px] font-bold text-espresso leading-[1.1] animate-fade-in-up">
          Pastelería Artesanal
        </h1>
        <p className="font-body text-base md:text-lg text-warm-gray mt-6 max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Endulzamos tus momentos con creaciones únicas, hechas con amor y los mejores ingredientes
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Link to="/catalogo" className="inline-flex items-center justify-center rounded-full bg-dusty-pink text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-mauve hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(212,166,154,0.3)] transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none">
            Ver Catálogo
          </Link>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-full border-[1.5px] border-dusty-pink text-dusty-pink px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-dusty-pink hover:text-white transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none">
            Hacé tu Pedido
          </a>
        </div>
      </div>
    </section>
  );
}

function TrustBadges() {
  const reveal = useScrollReveal();
  const badges = [
    { icon: Clock, text: 'Pedidos con 48hs de anticipación' },
    { icon: Truck, text: 'Envíos en Rosario y Roldán' },
    { icon: Heart, text: 'Hecho 100% artesanal' },
  ];
  return (
    <section ref={reveal.ref} className="py-6 md:py-8 px-4 bg-blush/40">
      <div className={`container flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 ${reveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
        {badges.map((b, i) => (
          <div key={i} className="flex items-center gap-3 text-warm-gray">
            <b.icon size={20} className="text-dusty-pink flex-shrink-0" />
            <span className="text-sm font-body">{b.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedSection() {
  const reveal = useScrollReveal();
  const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('featured', true).eq('active', true).limit(6);
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

  return (
    <section ref={reveal.ref} className="py-20 md:py-24 px-4">
      <div className="container">
        <h2 className={`font-display text-2xl md:text-4xl font-bold text-espresso text-center ${reveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          Nuestros Favoritos
        </h2>
        <SectionDivider />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
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
              <ProductCard product={p} index={reveal.isVisible ? i : -1} variants={getVariants(p.id)} compact />
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/catalogo" className="text-dusty-pink hover:text-mauve font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded">
            Ver todo el catálogo →
          </Link>
        </div>
      </div>
      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} variants={getVariants(selectedProduct.id)} onClose={() => setSelectedProduct(null)} />
      )}
    </section>
  );
}

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
          </button>
        </div>
        <div className="p-6">
          <span className="text-xs uppercase tracking-[0.08em] font-semibold text-warm-gray">{product.category}</span>
          <h3 className="font-display text-2xl font-bold text-espresso mt-1">{product.name}</h3>
          {product.description && <p className="text-warm-gray mt-3 leading-relaxed">{product.description}</p>}

          {/* Variants */}
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

          <p className="font-body text-2xl font-semibold text-espresso mt-4">{formatPrice(currentPrice)}</p>

          {/* Quantity */}
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
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-all active:scale-95 ${added ? 'bg-sage text-white' : 'bg-dusty-pink text-white hover:bg-mauve'}`}
            >
              {added ? <><Check size={16} /> ¡Agregado!</> : <><ShoppingBag size={16} /> Agregar al Pedido</>}
            </button>
            <a
              href={consultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-[#1da851] transition-all active:scale-95"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutPreview() {
  const reveal = useScrollReveal();
  return (
    <section ref={reveal.ref} className="py-20 md:py-24 px-4 bg-blush/30">
      <div className="container">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${reveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/5]">
            <img src={tiramisuImg} alt="Tiramisú artesanal de Le Sucrée" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-accent">Nuestra Historia</span>
            <h2 className="font-display text-2xl md:text-[32px] font-bold text-espresso mt-3 leading-tight">Hecho a mano, con pasión</h2>
            <p className="text-warm-gray mt-4 leading-relaxed">En Le Sucrée creemos que cada creación cuenta una historia. Desde nuestro rincón en Rosario, elaboramos cada pieza con ingredientes seleccionados y mucho amor.</p>
            <p className="text-warm-gray mt-3 leading-relaxed">Cada torta, cada cookie y cada box es una experiencia artesanal pensada para hacer tus momentos más dulces.</p>
            <Link to="/nosotros" className="inline-block mt-6 text-dusty-pink hover:text-mauve font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded">Conocenos →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const INSTAGRAM_GRID = [
  { img: pistachoImg, alt: 'Tarta de pistacho y chocolate blanco', url: 'https://www.instagram.com/p/DUYvpAVD-q4/' },
  { img: pavlovaImg, alt: 'Pavlova con frutos rojos', url: 'https://www.instagram.com/p/DL-jG6ouV9X/' },
  { img: petitFoursImg, alt: 'Box de petit fours surtidos', url: 'https://www.instagram.com/p/DL28Z_su87D/' },
  { img: dulceDeLecheImg, alt: 'Torre de panqueques con dulce de leche', url: 'https://www.instagram.com/p/DA_QwEkx3DB/' },
  { img: cookiesImg, alt: 'Cookies artesanales con pistachos', url: 'https://www.instagram.com/p/DLGJCt_OYhk/' },
  { img: chocolateAvellanasImg, alt: 'Tarta de chocolate con avellanas', url: 'https://www.instagram.com/p/C-BPlNlP3CG/' },
];

function InstagramSection() {
  const reveal = useScrollReveal();
  return (
    <section ref={reveal.ref} className="py-20 md:py-24 px-4">
      <div className="container">
        <h2 className={`font-display text-2xl md:text-4xl font-bold text-espresso text-center ${reveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>Seguinos en Instagram</h2>
        <SectionDivider />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-12 max-w-3xl mx-auto">
          {INSTAGRAM_GRID.map((post, i) => (
            <a key={i} href={post.url} target="_blank" rel="noopener noreferrer" className={`aspect-square rounded-lg overflow-hidden relative group block ${reveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: `${i * 0.08}s` }} aria-label={post.alt}>
              <img src={post.img} alt={post.alt} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-espresso/0 group-hover:bg-espresso/30 transition-colors duration-300 flex items-center justify-center">
                <Instagram className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" size={28} />
              </div>
            </a>
          ))}
        </div>
        <div className="text-center mt-4">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-dusty-pink hover:text-mauve font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded" aria-label="Instagram de Le Sucrée">{INSTAGRAM_HANDLE}</a>
        </div>
      </div>
    </section>
  );
}

function WhatsAppCTA() {
  const reveal = useScrollReveal();
  return (
    <section ref={reveal.ref} className="py-16 md:py-20 px-4 bg-blush">
      <div className={`container text-center ${reveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
        <h2 className="font-display text-2xl md:text-[28px] font-bold text-espresso">¿Querés hacer un pedido?</h2>
        <p className="font-body text-base text-warm-gray mt-3">Escribinos por WhatsApp y te asesoramos</p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-8 rounded-full bg-[#25D366] text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-[#1da851] hover:scale-[1.02] transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:outline-none">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Chateá con nosotros
        </a>
      </div>
    </section>
  );
}

export default function Index() {
  return (
    <>
      <HeroSection />
      <TrustBadges />
      <FeaturedSection />
      <AboutPreview />
      <InstagramSection />
      <WhatsAppCTA />
    </>
  );
}
