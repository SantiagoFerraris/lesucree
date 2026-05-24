import SectionDivider from '@/components/SectionDivider';
import SEOHead from '@/components/SEOHead';

export default function PoliticaPrivacidad() {
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
            Política de Privacidad
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
                ¿Qué información recopilamos?
              </h2>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                Al completar el formulario de contacto o realizar un pedido, podemos recopilar:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-1 text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                <li>Nombre y apellido</li>
                <li>Número de teléfono</li>
                <li>Dirección de correo electrónico (opcional)</li>
                <li>Contenido del mensaje o detalle del pedido</li>
              </ul>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                ¿Para qué usamos tu información?
              </h2>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                Utilizamos tus datos exclusivamente para:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-1 text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                <li>Responder tu consulta o confirmar tu pedido</li>
                <li>Coordinar el retiro de tu pedido</li>
                <li>Enviarte información relacionada con tu compra</li>
              </ul>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8] mt-4">
                No compartimos, vendemos ni cedemos tus datos personales a terceros.
              </p>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                ¿Cómo protegemos tu información?
              </h2>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                Tu información se almacena de forma segura y solo es accesible por el equipo de Le Sucrée Pastelería. No almacenamos datos de tarjetas de crédito ni información bancaria sensible.
              </p>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                Tus derechos
              </h2>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                En cumplimiento de la Ley 25.326, tenés derecho a acceder, rectificar y suprimir tus datos personales. Para ejercer estos derechos, podés contactarnos en: pastelerialesucree@gmail.com
              </p>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                Cookies
              </h2>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                Este sitio puede utilizar cookies técnicas necesarias para su funcionamiento. No utilizamos cookies de seguimiento publicitario.
              </p>
            </div>

            <div>
              <h2 className="font-script text-2xl sm:text-3xl text-espresso mb-4">
                Contacto
              </h2>
              <p className="text-[15px] sm:text-[17px] leading-[1.7] sm:leading-[1.8]">
                Si tenés preguntas sobre esta política, escribinos a pastelerialesucree@gmail.com
              </p>
            </div>

            <p className="text-xs sm:text-sm text-warm-gray/80 leading-relaxed pt-4 border-t border-warm-gray/15">
              La DNPDP (Dirección Nacional de Protección de Datos Personales) tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
