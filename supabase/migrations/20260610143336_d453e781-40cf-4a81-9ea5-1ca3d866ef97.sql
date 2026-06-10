
CREATE TABLE public.legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  last_updated date DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legal_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.legal_pages TO authenticated;
GRANT ALL ON public.legal_pages TO service_role;

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legal pages are viewable by everyone"
  ON public.legal_pages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert legal pages"
  ON public.legal_pages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update legal pages"
  ON public.legal_pages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete legal pages"
  ON public.legal_pages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_legal_pages_updated_at
  BEFORE UPDATE ON public.legal_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.legal_pages (slug, title, content, last_updated) VALUES
('terminos-y-condiciones', 'Términos y Condiciones',
'<h2>Sobre Le Sucrée Pastelería</h2>
<p>Le Sucrée Pastelería es un emprendimiento de pastelería artesanal ubicado en Rosario, Santa Fe, Argentina. Contacto: pastelerialesucree@gmail.com</p>

<h2>Pedidos</h2>
<ul>
<li>Los pedidos deben realizarse con un mínimo de 48 horas de anticipación a la fecha de retiro. Para tortas personalizadas, el plazo mínimo es de 72 horas.</li>
<li>Para confirmar un pedido se requiere el pago de una seña del 50% del total.</li>
<li>El saldo restante se abona el día del retiro.</li>
<li>Los pedidos se confirman únicamente una vez recibida y verificada la seña.</li>
</ul>

<h2>Medios de pago</h2>
<p>Aceptamos los siguientes medios de pago:</p>
<ul>
<li>Transferencia bancaria / CVU</li>
<li>Mercado Pago</li>
<li>Efectivo (en el momento del retiro)</li>
</ul>

<h2>Retiro</h2>
<ul>
<li>Todos los pedidos son exclusivamente para retiro en Rosario, Santa Fe.</li>
<li>No realizamos envíos a domicilio.</li>
<li>Horarios de retiro: Mañana 9:00–12:00 / Tarde 14:00–19:00.</li>
<li>Una vez confirmado tu pedido te informamos la dirección exacta de retiro.</li>
</ul>

<h2>Cancelaciones y reprogramaciones</h2>
<ul>
<li>Si necesitás cancelar tu pedido con más de 48 horas de anticipación, te devolvemos la seña abonada.</li>
<li>Si cancelás con menos de 48 horas de anticipación, la seña no es reembolsable.</li>
<li>Podés reprogramar tu pedido para otra fecha sin perder la seña, sujeto a disponibilidad.</li>
<li>Si el error es nuestro (producto incorrecto, demora significativa, etc.), la seña se devuelve en todos los casos.</li>
</ul>

<h2>Productos</h2>
<ul>
<li>Todos nuestros productos son elaborados artesanalmente con ingredientes frescos.</li>
<li>Los productos pueden contener trazas de gluten, lácteos, huevo, frutos secos y otros alérgenos. Si tenés alguna alergia o restricción alimentaria, consultanos antes de hacer tu pedido.</li>
<li>Las imágenes del catálogo son ilustrativas. Los productos artesanales pueden presentar variaciones menores en forma y decoración.</li>
</ul>

<h2>Contacto</h2>
<p>Para consultas escribinos a pastelerialesucree@gmail.com</p>',
'2026-05-01'),

('politica-de-privacidad', 'Política de Privacidad',
'<h2>¿Qué información recopilamos?</h2>
<p>Al completar el formulario de contacto o realizar un pedido, podemos recopilar:</p>
<ul>
<li>Nombre y apellido</li>
<li>Número de teléfono</li>
<li>Dirección de correo electrónico (opcional)</li>
<li>Contenido del mensaje o detalle del pedido</li>
</ul>

<h2>¿Para qué usamos tu información?</h2>
<p>Utilizamos tus datos exclusivamente para:</p>
<ul>
<li>Responder tu consulta o confirmar tu pedido</li>
<li>Coordinar el retiro de tu pedido</li>
<li>Enviarte información relacionada con tu compra</li>
</ul>
<p>No compartimos, vendemos ni cedemos tus datos personales a terceros.</p>

<h2>¿Cómo protegemos tu información?</h2>
<p>Tu información se almacena de forma segura y solo es accesible por el equipo de Le Sucrée Pastelería. No almacenamos datos de tarjetas de crédito ni información bancaria sensible.</p>

<h2>Tus derechos</h2>
<p>En cumplimiento de la Ley 25.326, tenés derecho a acceder, rectificar y suprimir tus datos personales. Para ejercer estos derechos, podés contactarnos en: pastelerialesucree@gmail.com</p>

<h2>Cookies</h2>
<p>Este sitio puede utilizar cookies técnicas necesarias para su funcionamiento. No utilizamos cookies de seguimiento publicitario.</p>

<h2>Contacto</h2>
<p>Si tenés preguntas sobre esta política, escribinos a pastelerialesucree@gmail.com</p>

<p><strong>Nota:</strong> La DNPDP (Dirección Nacional de Protección de Datos Personales) tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.</p>',
'2026-05-01');
