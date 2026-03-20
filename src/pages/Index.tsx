import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import SectionDivider from '@/components/SectionDivider';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { WHATSAPP_URL, INSTAGRAM_URL, INSTAGRAM_HANDLE } from '@/lib/constants';

function HeroSection() {
  return (
    <section className="min-h-[90vh] md:min-h-[90vh] flex items-center justify-center bg-gradient-to-b from-blush to-cream px-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="section-divider mb-8 animate-fade-in-up" />
        <h1
          className="font-display text-[32px] md:text-[56px] font-bold text-espresso leading-[1.1] animate-fade-in-up"
        >
          Pastelería Artesanal
        </h1>
        <p
          className="font-body text-base md:text-lg text-warm-gray mt-6 max-w-lg mx-auto animate-fade-in-up"
          style={{ animationDelay: '0.2s' }}
        >
          Endulzamos tus momentos con creaciones únicas, hechas con amor y los mejores ingredientes
        </p>
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in-up"
          style={{ animationDelay: '0.4s' }}
        >
          <Link
            to="/catalogo"
            className="inline-flex items-center justify-center rounded-full bg-dusty-pink text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-mauve hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(212,166,154,0.3)] transition-all duration-300 active:scale-95"
          >
            Ver Catálogo
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border-[1.5px] border-dusty-pink text-dusty-pink px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-dusty-pink hover:text-white transition-all duration-300 active:scale-95"
          >
            Hacé tu Pedido
          </a>
        </div>
      </div>
    </section>
  );
}

function FeaturedSection() {
  const reveal = useScrollReveal();
  const { data: products } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('featured', true)
        .eq('active', true)
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  return (
    <section ref={reveal.ref} className="py-20 md:py-24 px-4">
      <div className="container">
        <h2 className={`font-display text-2xl md:text-4xl font-bold text-espresso text-center ${reveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          Nuestros Favoritos
        </h2>
        <SectionDivider />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {products?.map((p, i) => (
            <ProductCard key={p.id} product={p} index={reveal.isVisible ? i : -1} />
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/catalogo" className="text-dusty-pink hover:text-mauve font-semibold transition-colors">
            Ver todo el catálogo →
          </Link>
        </div>
      </div>
    </section>
  );
}

function AboutPreview() {
  const reveal = useScrollReveal();
  return (
    <section ref={reveal.ref} className="py-20 md:py-24 px-4 bg-blush/30">
      <div className="container">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${reveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img
              src="https://placehold.co/600x500/F5E6DA/3E2723?text=Le+Sucree"
              alt="Espacio de trabajo de Le Sucrée"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-accent">Nuestra Historia</span>
            <h2 className="font-display text-2xl md:text-[32px] font-bold text-espresso mt-3 leading-tight">
              Hecho a mano, con pasión
            </h2>
            <p className="text-warm-gray mt-4 leading-relaxed">
              En Le Sucrée creemos que cada creación cuenta una historia. Desde nuestro rincón en Rosario, elaboramos cada pieza con ingredientes seleccionados y mucho amor.
            </p>
            <p className="text-warm-gray mt-3 leading-relaxed">
              Cada torta, cada cookie y cada box es una experiencia artesanal pensada para hacer tus momentos más dulces.
            </p>
            <Link to="/nosotros" className="inline-block mt-6 text-dusty-pink hover:text-mauve font-semibold transition-colors">
              Conocenos →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function InstagramSection() {
  const reveal = useScrollReveal();
  const placeholders = Array.from({ length: 6 }, (_, i) => i);
  return (
    <section ref={reveal.ref} className="py-20 md:py-24 px-4">
      <div className="container">
        <h2 className={`font-display text-2xl md:text-4xl font-bold text-espresso text-center ${reveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          Seguinos en Instagram
        </h2>
        <SectionDivider />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-12 max-w-3xl mx-auto">
          {placeholders.map(i => (
            <a
              key={i}
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`aspect-square rounded-lg overflow-hidden relative group ${reveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <img
                src={`https://placehold.co/400x400/F5E6DA/3E2723?text=IG+${i + 1}`}
                alt={`Instagram ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-espresso/0 group-hover:bg-espresso/30 transition-colors duration-300 flex items-center justify-center">
                <Instagram className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" size={28} />
              </div>
            </a>
          ))}
        </div>
        <div className="text-center mt-8">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-dusty-pink hover:text-mauve font-semibold transition-colors"
          >
            {INSTAGRAM_HANDLE}
          </a>
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
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-8 rounded-full bg-[#25D366] text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-[#1da851] hover:scale-[1.02] transition-all duration-300 active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
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
      <FeaturedSection />
      <AboutPreview />
      <InstagramSection />
      <WhatsAppCTA />
    </>
  );
}
