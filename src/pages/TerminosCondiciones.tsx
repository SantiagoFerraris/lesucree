import SectionDivider from '@/components/SectionDivider';
import SEOHead from '@/components/SEOHead';

export default function TerminosCondiciones() {
  return (
    <section className="pt-[72px]">
      <SEOHead
        title="Términos y Condiciones | Le Sucrée Pastelería"
        description="Términos y condiciones de Le Sucrée Pastelería."
        path="/terminos-y-condiciones"
      />

      {/* Hero */}
      <div className="bg-blush py-12 sm:py-16 md:py-24 px-3 sm:px-4">
        <div className="container text-center">
          <h1 className="font-script text-[32px] sm:text-[40px] md:text-[52px] text-espresso">
            Términos y Condiciones
          </h1>
          <p className="text-[13px] sm:text-sm text-warm-gray mt-3">
            Última actualización: Mayo 2026
          </p>
          <SectionDivider />
        </div>
      </div>

      {/* Content */}
      <div className="py-10 sm:py-16 md:py-20 px-3 sm:px-4">
        <div className="container max-w-3xl">
          <div className="space-y-10 text-espresso">
            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                Sobre Le Sucrée Pastelería
              </h2>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                Le Sucrée Pastelería es un emprendimiento de pastelería artesanal ubicado en Rosario, Santa Fe, Argentina. Contacto: pastelerialesucree@gmail.com
              </p>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                Pedidos
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                <li>Los pedidos deben realizarse con un mínimo de 48 horas de anticipación a la fecha de retiro. Para tortas personalizadas, el plazo mínimo es de 72 horas.</li>
                <li>Para confirmar un pedido se requiere el pago de una seña del 50% del total.</li>
                <li>El saldo restante se abona el día del retiro.</li>
                <li>Los pedidos se confirman únicamente una vez recibida y verificada la seña.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                Medios de pago
              </h2>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                Aceptamos los siguientes medios de pago:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-1 text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                <li>Transferencia bancaria / CVU</li>
                <li>Mercado Pago</li>
                <li>Efectivo (en el momento del retiro)</li>
              </ul>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                Retiro
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                <li>Todos los pedidos son exclusivamente para retiro en Rosario, Santa Fe.</li>
                <li>No realizamos envíos a domicilio.</li>
                <li>Horarios de retiro: Mañana 9:00–12:00 / Tarde 14:00–19:00.</li>
                <li>Una vez confirmado tu pedido te informamos la dirección exacta de retiro.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                Cancelaciones y reprogramaciones
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                <li>Si necesitás cancelar tu pedido con más de 48 horas de anticipación, te devolvemos la seña abonada.</li>
                <li>Si cancelás con menos de 48 horas de anticipación, la seña no es reembolsable.</li>
                <li>Podés reprogramar tu pedido para otra fecha sin perder la seña, sujeto a disponibilidad.</li>
                <li>Si el error es nuestro (producto incorrecto, demora significativa, etc.), la seña se devuelve en todos los casos.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                Productos
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                <li>Todos nuestros productos son elaborados artesanalmente con ingredientes frescos.</li>
                <li>Los productos pueden contener trazas de gluten, lácteos, huevo, frutos secos y otros alérgenos. Si tenés alguna alergia o restricción alimentaria, consultanos antes de hacer tu pedido.</li>
                <li>Las imágenes del catálogo son ilustrativas. Los productos artesanales pueden presentar variaciones menores en forma y decoración.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                Contacto
              </h2>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                Para consultas escribinos a pastelerialesucree@gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
