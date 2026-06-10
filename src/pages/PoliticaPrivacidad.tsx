import { useQuery } from '@tanstack/react-query';
import SectionDivider from '@/components/SectionDivider';
import SEOHead from '@/components/SEOHead';
import { supabase } from '@/integrations/supabase/client';

export default function PoliticaPrivacidad() {
  const { data } = useQuery({
    queryKey: ['legal-page', 'politica-de-privacidad'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('title, content, last_updated')
        .eq('slug', 'politica-de-privacidad')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const title = data?.title || 'Política de Privacidad';
  const lastUpdated = data?.last_updated
    ? new Date(data.last_updated + 'T00:00:00').toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
      })
    : 'Mayo 2026';

  return (
    <section className="pt-[72px]">
      <SEOHead
        title="Política de Privacidad | Le Sucrée Pastelería"
        description="Política de privacidad de Le Sucrée Pastelería."
        path="/politica-de-privacidad"
      />

      {/* Hero */}
      <div className="bg-blush py-12 sm:py-16 md:py-24 px-3 sm:px-4">
        <div className="container text-center">
          <h1 className="font-script text-[32px] sm:text-[40px] md:text-[52px] text-espresso">
            {title}
          </h1>
          <p className="text-[13px] sm:text-sm text-warm-gray mt-3">
            Última actualización: {lastUpdated}
          </p>
          <SectionDivider />
        </div>
      </div>

      {/* Content */}
      <div className="py-10 sm:py-16 md:py-20 px-3 sm:px-4">
        <div className="container max-w-3xl">
          <div
            className="legal-content space-y-10 text-espresso text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]"
            dangerouslySetInnerHTML={{ __html: data?.content || '' }}
          />
        </div>
      </div>
    </section>
  );
}
