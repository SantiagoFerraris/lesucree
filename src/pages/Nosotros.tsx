import { Heart, Leaf, ChefHat } from 'lucide-react';
import SectionDivider from '@/components/SectionDivider';
import SEOHead from '@/components/SEOHead';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useHistoriaImageUrl } from '@/hooks/useSiteSettings';
import tiramisuImg from '@/assets/torta_1_tiramisu.jpg';

const values = [
  { icon: ChefHat, title: 'Artesanal', desc: 'Cada creación es elaborada a mano, con dedicación y atención al detalle.' },
  { icon: Heart, title: 'Con Amor', desc: 'En cada receta dejo un pedacito de mí, porque sé que mis tortas acompañan momentos únicos y especiales.' },
  { icon: Leaf, title: 'Ingredientes Naturales', desc: 'Elijo uno a uno ingredientes frescos y nobles, para que cada bocado se sienta como un abrazo dulce.' },
];

export default function Nosotros() {
  const storyReveal = useScrollReveal();
  const valuesReveal = useScrollReveal();
  const { data: historiaImageUrl } = useHistoriaImageUrl();

  return (
    <section className="pt-[72px]">
      <SEOHead title="Nuestra Historia | Le Sucrée Pastelería" description="Conocé la historia detrás de Le Sucrée, una pastelería artesanal en Rosario." path="/historia" />
      {/* Hero */}
      <div
        className="relative bg-blush py-12 sm:py-16 md:py-24 px-3 sm:px-4 overflow-hidden"
        style={historiaImageUrl ? {
          backgroundImage: `url(${historiaImageUrl})`,
          backgroundColor: '#fdf6f0',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {historiaImageUrl && (
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{ background: 'rgba(0, 0, 0, 0.38)' }}
          />
        )}
        <div className="container text-center relative z-10">
          <h1 className={`font-script text-[32px] sm:text-[40px] md:text-[52px] ${historiaImageUrl ? 'text-white' : 'text-espresso'}`}>Historia</h1>
          <SectionDivider />
        </div>
      </div>


      {/* Story — 2 column with photo */}
      <div ref={storyReveal.ref} className="py-10 sm:py-16 md:py-20 px-3 sm:px-4">
        <div className={`container max-w-5xl ${storyReveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8] text-espresso">
                Le Sucrée Pastelería nació de mi pasión por la pastelería artesanal y del deseo de crear productos que transmitan sabor, dedicación y calidad en cada detalle. Detrás de cada elaboración hay ingredientes seleccionados, recetas caseras y una presentación cuidada para brindar una experiencia especial.
              </p>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8] text-espresso mt-6">
                Soy Julieta, Licenciada en Recursos Humanos, y esa formación me permitió desarrollar una mirada organizada, comprometida y enfocada en ofrecer siempre la mejor atención a cada cliente.
              </p>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8] text-espresso mt-6">
                Hoy, Le Sucrée Pastelería acompaña eventos y momentos cotidianos con productos artesanales hechos con pasión.
              </p>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img
                src={tiramisuImg}
                alt="Taller de Le Sucrée Pastelería"
                className="w-full h-full object-cover aspect-[4/5]"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div ref={valuesReveal.ref} className="py-10 sm:py-16 md:py-20 px-3 sm:px-4 bg-blush/30">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {values.map((v, i) => (
              <div
                key={v.title}
                className={`bg-soft-white rounded-xl sm:rounded-2xl p-5 sm:p-8 text-center shadow-sm ${valuesReveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <v.icon className="mx-auto text-dusty-pink" size={32} strokeWidth={1.5} />
                <h3 className="font-body text-xs uppercase tracking-[0.08em] text-warm-gray mt-4">{v.title}</h3>
                <p className="text-espresso/70 text-sm mt-2 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
