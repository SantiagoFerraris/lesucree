import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import SectionDivider from '@/components/SectionDivider';

const faqs = [
  {
    q: '¿Con cuánta anticipación hay que hacer el pedido?',
    a: 'Todos nuestros productos se elaboran artesanalmente, por eso necesitamos un mínimo de 48 horas de anticipación para preparar tu pedido. Para tortas personalizadas o pedidos grandes, el plazo mínimo es de 72 horas.',
  },
  {
    q: '¿Cómo hago un pedido?',
    a: 'Podés hacer tu pedido directamente desde el catálogo o escribirnos por WhatsApp. Una vez confirmado el pedido, te enviamos los datos para abonar la seña y listo.',
  },
  {
    q: '¿Qué es la seña y por qué se pide?',
    a: 'La seña es un pago del 50% del total del pedido que reserva tu lugar en nuestra agenda. Como todos los productos son artesanales y se preparan especialmente para vos, la seña nos permite organizarnos y garantizarte el pedido. El saldo restante se abona el día del retiro.',
  },
  {
    q: '¿Qué medios de pago aceptan?',
    a: 'Aceptamos transferencia bancaria, Mercado Pago y efectivo. El efectivo solo se acepta en el momento del retiro.',
  },
  {
    q: '¿Hacen envíos a domicilio?',
    a: 'Por el momento no realizamos envíos. Todos los pedidos son para retiro en Rosario. Una vez confirmado tu pedido te informamos la dirección exacta. Nuestros horarios de retiro son de 9:00 a 12:00 y de 14:00 a 19:00.',
  },
  {
    q: '¿Puedo cancelar o reprogramar mi pedido?',
    a: 'Sí. Si cancelás con más de 48 horas de anticipación, te devolvemos la seña. Si cancelás con menos tiempo, la seña no es reembolsable. También podés reprogramar tu pedido para otra fecha sin perder la seña, sujeto a disponibilidad.',
  },
  {
    q: '¿Los productos tienen alérgenos?',
    a: 'Sí. Nuestros productos pueden contener trazas de gluten, lácteos, huevo y frutos secos. Si tenés alguna alergia o restricción alimentaria, por favor avisanos antes de hacer el pedido para que podamos orientarte.',
  },
  {
    q: '¿Hacen tortas personalizadas?',
    a: '¡Sí! Hacemos tortas personalizadas para cumpleaños, eventos y ocasiones especiales. Escribinos por WhatsApp o por el formulario de contacto y contanos tu idea.',
  },
];

export default function FAQ() {
  return (
    <div className="bg-cream py-12 sm:py-16 md:py-20 px-3 sm:px-4">
      <div className="container max-w-3xl">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="font-script text-[32px] sm:text-[40px] md:text-[48px] text-espresso">
            Preguntas frecuentes
          </h2>
          <SectionDivider />
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border-b border-warm-gray/20"
            >
              <AccordionTrigger className="min-h-[44px] py-4 text-left text-[15px] sm:text-[17px] font-body font-medium text-espresso hover:no-underline hover:text-dusty-pink">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-[14px] sm:text-[16px] leading-[1.7] text-espresso/80 pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
