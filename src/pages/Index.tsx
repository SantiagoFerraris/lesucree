import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Instagram, Clock, Truck, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import SectionDivider from "@/components/SectionDivider";
import SEOHead from "@/components/SEOHead";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCategories } from "@/hooks/useCategories";
import { useActivePromotions } from "@/hooks/useActivePromotions";
import { WHATSAPP_NUMBER, INSTAGRAM_URL, INSTAGRAM_HANDLE } from "@/lib/constants";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/formatPrice";
import ProductImage from "@/components/ProductImage";
import { useCart } from "@/contexts/CartContext";
import { useHeroImageUrl, useSiteSettings } from "@/hooks/useSiteSettings";
import ProductDetailModal from "@/components/ProductDetailModal";
import ProductCarousel from "@/components/ProductCarousel";
import InstagramCarousel from "@/components/InstagramCarousel";
import type { Tables } from "@/integrations/supabase/types";


import tiramisuImg from "@/assets/torta_1_tiramisu.jpg";

interface Variant {
  id: string;
  label: string;
  price: number;
  sort_order: number;
  product_id: string;
}

/* ─── HERO ─── */
function transformHeroUrl(src: string | null): string | null {
  if (!src) return null;
  if (!src.includes('supabase.co/storage')) return src;
  if (/[?&](width|quality|format)=/.test(src)) return src;
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}width=1400&quality=80&format=webp`;
}

function HeroSection() {
  const { data: heroImageUrl, isLoading: heroLoading } = useHeroImageUrl();
  const { data: settings } = useSiteSettings();
  const bgImage = transformHeroUrl(heroImageUrl || null);
  const heroTitle = settings?.hero_title || 'Le Sucrée';
  const heroSubtitle = settings?.hero_subtitle || 'Pastelería Artesanal';
  const heroText = settings?.hero_text || 'Endulzar tus momentos con creaciones únicas, hechas con amor y los mejores ingredientes';

  return (
    <section
      className="relative min-h-[70vh] flex items-center"
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        backgroundColor: '#fdf6f0',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(253,246,240,0.92) 0%, rgba(253,246,240,0.80) 45%, rgba(253,246,240,0.35) 75%, transparent 100%)",
        }}
      />

      <div className="container relative z-10 py-24 md:py-32 px-4">
        <div className="max-w-xl">
          <h1 className="text-espresso">
            <span className="font-script text-[3rem] sm:text-[3.5rem] md:text-[4rem] leading-none block">
              {heroTitle}
            </span>
            <span className="font-body text-[1rem] sm:text-[1.1rem] md:text-[1.2rem] uppercase tracking-[0.2em] text-espresso mt-2 block">
              {heroSubtitle}
            </span>
          </h1>
          <p className="font-body text-base md:text-lg text-espresso/80 mt-6 max-w-[500px] leading-relaxed">
            Tortas, cookies y postres artesanales en Rosario — hechos a mano con ingredientes seleccionados, para que cada momento sea único.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              to="/catalogo"
              className="inline-flex items-center justify-center bg-espresso text-white px-8 py-4 text-[14px] font-semibold tracking-[0.15em] hover:bg-espresso/90 transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-espresso focus-visible:outline-none"
            >
              Ver Catálogo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── TRUST BADGES ─── */
function TrustBadges() {
  const reveal = useScrollReveal();
  const badges = [
    { icon: Clock, text: "Pedí con 48hs de anticipación" },
    { icon: Truck, text: "Retiro en Rosario" },
    { icon: Heart, text: "100% artesanal, hecho a mano" },
  ];
  return (
    <section ref={reveal.ref} className="py-5 md:py-6 px-4 bg-white/60 backdrop-blur-sm border-y border-blush/40">
      <div
        className={`container flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0 ${reveal.isVisible ? "animate-fade-in-up" : "opacity-0"}`}
      >
        {badges.map((b, i) => (
          <div key={i} className="flex items-center gap-3 text-espresso/70 md:px-8">
            <b.icon size={18} className="text-dusty-pink flex-shrink-0" />
            <span className="text-sm font-body font-semibold">{b.text}</span>
            {i < badges.length - 1 && (
              <span className="hidden md:block w-px h-5 bg-gold-accent/30 ml-8" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── FEATURED / FAVORITES ─── */
function FeaturedSection() {
  const reveal = useScrollReveal();
  const [selectedProduct, setSelectedProduct] = useState<Tables<"products"> | null>(null);
  const { data: categories } = useCategories();
  const promosMap = useActivePromotions();

  const { data: products, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, category, image_url, featured, active, status, is_customizable, sort_order, visible_from, visible_until, urgency_message")
        .eq("featured", true)
        .eq("active", true)
        .neq("status", "oculto")
        .or(`visible_from.is.null,visible_from.lte.${nowIso}`)
        .or(`visible_until.is.null,visible_until.gte.${nowIso}`)
        .limit(6);
      if (error) throw error;
      return data as Tables<"products">[];
    },
  });

  const { data: allVariants } = useQuery({
    queryKey: ["all-variants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_variants").select("*").order("sort_order");
      if (error) throw error;
      return data as Variant[];
    },
  });

  const getVariants = (productId: string) => allVariants?.filter((v) => v.product_id === productId) || [];

  return (
    <section ref={reveal.ref} className="py-12 sm:py-16 md:py-24 px-3 sm:px-4">
      <div className="container">
        <span className={`block text-xs uppercase tracking-[0.12em] font-semibold text-gold-accent text-center ${reveal.isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          Los más pedidos
        </span>
        <h2
          className={`font-script text-[32px] sm:text-[40px] md:text-[52px] text-espresso text-center mt-1 ${reveal.isVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          Favoritos
        </h2>
        <p className={`text-center text-sm text-espresso/60 mt-1 ${reveal.isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          Productos más elegidos por los clientes
        </p>
        <SectionDivider />
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-product animate-pulse">
                <div className="aspect-[4/3] bg-blush" />
                <div className="p-6 space-y-3">
                  <div className="h-3 bg-blush rounded w-1/3" />
                  <div className="h-5 bg-blush rounded w-2/3" />
                  <div className="h-4 bg-blush rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && (
          <div className="mt-8 sm:mt-12">
            <ProductCarousel
              products={products || []}
              variants={allVariants}
              categories={categories}
              activePromotions={promosMap}
              onProductClick={setSelectedProduct}
            />
          </div>
        )}
        <div className="text-center mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/catalogo"
            className="inline-flex items-center justify-center bg-espresso text-white px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.12em] hover:bg-espresso/90 transition-all duration-300 active:scale-95 rounded-full"
          >
            Ver Catálogo
          </Link>
          <a
            href={getWhatsAppLink(WHATSAPP_NUMBER) ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#25D366] hover:text-[#1da851] font-semibold transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            O pedí por WhatsApp
          </a>
        </div>
      </div>
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          variants={getVariants(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  );
}

/* ─── ABOUT PREVIEW ─── */
function AboutPreview() {
  const reveal = useScrollReveal();
  return (
    <section ref={reveal.ref} className="py-12 sm:py-16 md:py-24 px-3 sm:px-4 bg-blush/30">
      <div className="container">
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${reveal.isVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="rounded-lg overflow-hidden shadow-lg md:w-full">
            <img
              src={tiramisuImg}
              alt="Tiramisú artesanal de Le Sucrée"
              className="w-full h-full object-cover aspect-[4/5]"
              loading="lazy"
            />
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-accent">Historia</span>
            <h2 className="font-script text-[32px] sm:text-[40px] md:text-[52px] text-espresso mt-3 leading-tight">
              Hecho a mano, con pasión
            </h2>
            <p className="text-espresso/70 mt-4 leading-relaxed">
              Desde Rosario, elaboro cada pieza a mano con ingredientes seleccionados. Cada torta, cookie y box está pensada para hacer tus momentos más dulces.
            </p>
            <Link
              to="/historia"
              className="inline-flex items-center justify-center mt-6 rounded-full border-[1.5px] border-espresso text-espresso px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-espresso hover:text-white transition-all duration-300 active:scale-95"
            >
              Conoceme →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── INSTAGRAM ─── */
const INSTAGRAM_GRID = [
  { img: pistachoImg, alt: "Tarta de pistacho y chocolate blanco", url: "https://www.instagram.com/p/DUYvpAVD-q4/" },
  { img: pavlovaImg, alt: "Pavlova con frutos rojos", url: "https://www.instagram.com/p/DL-jG6ouV9X/" },
  { img: petitFoursImg, alt: "Box de petit fours surtidos", url: "https://www.instagram.com/p/DL28Z_su87D/" },
  { img: dulceDeLecheImg, alt: "Torre de panqueques con dulce de leche", url: "https://www.instagram.com/p/DA_QwEkx3DB/" },
  { img: cookiesImg, alt: "Cookies artesanales con pistachos", url: "https://www.instagram.com/p/DLGJCt_OYhk/" },
  { img: chocolateAvellanasImg, alt: "Tarta de chocolate con avellanas", url: "https://www.instagram.com/p/C-BPlNlP3CG/" },
];

function InstagramSection() {
  const reveal = useScrollReveal();
  return (
    <section ref={reveal.ref} className="py-12 sm:py-16 md:py-24 px-3 sm:px-4">
      <div className="container">
        <h2
          className={`font-script text-[32px] sm:text-[40px] md:text-[52px] text-espresso text-center ${reveal.isVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          Seguime en Instagram
        </h2>
        <SectionDivider />
        <div className="mt-6 max-w-4xl mx-auto">
          <InstagramCarousel posts={INSTAGRAM_GRID} />
        </div>
        <div className="text-center mt-4">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-dusty-pink hover:text-mauve font-semibold transition-colors"
            aria-label="Instagram de Le Sucrée"
          >
            {INSTAGRAM_HANDLE}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── WHATSAPP CTA ─── */
function WhatsAppCTA() {
  const reveal = useScrollReveal();
  return (
    <section ref={reveal.ref} className="py-16 md:py-20 px-4 bg-blush">
      <div className={`container text-center ${reveal.isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
        <h2 className="font-script text-[32px] sm:text-[40px] md:text-[52px] text-espresso">¿Querés hacer un pedido o tenés alguna consulta?</h2>
        <p className="font-body text-base text-espresso/70 mt-3 max-w-lg mx-auto">
          Tortas personalizadas, pedidos especiales o consultas — Escribime por WhatsApp y te respondo lo antes posible.
        </p>
        <a
          href={getWhatsAppLink(WHATSAPP_NUMBER) ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-12 py-5 text-[16px] font-semibold uppercase tracking-[0.1em] hover:bg-[#1da851] hover:scale-[1.02] transition-all duration-300 active:scale-95 shadow-lg mt-8 max-w-md mx-auto animate-whatsapp-pulse"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Chatear
        </a>
      </div>
    </section>
  );
}

/* ─── MAIN ─── */
export default function Index() {
  return (
    <>
      <SEOHead
        title="Le Sucrée Pastelería | Tortas Artesanales en Rosario"
        description="Tortas, alfajores, tartas y cookies artesanales en Rosario. Pedidos con retiro en el local."
        path="/"
      />
      <HeroSection />
      <TrustBadges />
      <FeaturedSection />
      <AboutPreview />
      <InstagramSection />
      <WhatsAppCTA />
    </>
  );
}
