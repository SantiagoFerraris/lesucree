import { useQuery } from '@tanstack/react-query';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import SectionDivider from '@/components/SectionDivider';
import { supabase } from '@/integrations/supabase/client';

export default function FAQ() {
  const { data: faqs, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="bg-cream py-12 sm:py-16 md:py-20 px-3 sm:px-4">
      <div className="container max-w-3xl">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="font-script text-[32px] sm:text-[40px] md:text-[48px] text-espresso">
            Preguntas frecuentes
          </h2>
          <SectionDivider />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-md bg-warm-gray/10 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {(faqs ?? []).map((item, i) => (
              <AccordionItem
                key={item.id}
                value={`item-${i}`}
                className="border-b border-warm-gray/20"
              >
                <AccordionTrigger className="min-h-[44px] py-4 text-left text-[15px] sm:text-[17px] font-body font-medium text-espresso hover:no-underline hover:text-dusty-pink">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-[14px] sm:text-[16px] leading-[1.7] text-espresso/80 pb-5 whitespace-pre-line">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
