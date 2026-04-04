import { Heart, Leaf, ChefHat } from 'lucide-react';
import SectionDivider from '@/components/SectionDivider';
import SEOHead from '@/components/SEOHead';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import tiramisuImg from '@/assets/torta_1_tiramisu.jpg';

const values = [
  { icon: ChefHat, title: 'Artesanal', desc: 'Cada creación es elaborada a mano, con dedicación y atención al detalle.' },
  { icon: Heart, title: 'Con Amor', desc: 'Ponemos pasión en cada receta, porque creemos que se siente en cada bocado.' },
  { icon: Leaf, title: 'Ingredientes Naturales', desc: 'Seleccionamos los mejores ingredientes para garantizar calidad y frescura.' },
];

export default function Nosotros() {
  const storyReveal = useScrollReveal();
  const valuesReveal = useScrollReveal();

  return (
    <section className="pt-[72px]">
      <SEOHead title="Nosotros | Le Sucrée Pastelería" description="Conocé la historia de Le Sucrée, pastelería artesanal en Rosario. Elaboramos cada pieza con ingredientes seleccionados y mucho amor." path="/nosotros" />
      {/* Hero */}
      <div className="bg-blush py-12 sm:py-16 md:py-24 px-3 sm:px-4">
        <div className="container text-center">
          <h1 className="font-display uppercase tracking-[0.25em] text-[28px] sm:text-[36px] md:text-[48px] text-espresso">Nuestra Historia</h1>
          <SectionDivider />
        </div>
      </div>

      {/* Story — 2 column with photo */}
      <div ref={storyReveal.ref} className="py-10 sm:py-16 md:py-20 px-3 sm:px-4">
        <div className={`container max-w-5xl ${storyReveal.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8] text-espresso/80">
                Le Sucrée nació de un sueño simple: compartir el arte de la pastelería hecha con amor. Desde nuestro pequeño taller en Rosario, cada día nos levantamos con la misma ilusión de crear piezas que hagan especiales los momentos de quienes nos eligen.
              </p>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8] text-espresso/80 mt-6">
                Creemos en lo artesanal, en tomarnos el tiempo necesario para que cada capa de bizcochuelo, cada relleno y cada decoración estén perfectos. No seguimos recetas de producción masiva — cada creación es pensada y elaborada con dedicación.
              </p>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8] text-espresso/80 mt-6">
                Nuestros ingredientes son cuidadosamente seleccionados, priorizando la calidad y la frescura. Porque sabemos que la diferencia está en los detalles, y que un buen postre puede transformar cualquier momento en un recuerdo inolvidable.
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
