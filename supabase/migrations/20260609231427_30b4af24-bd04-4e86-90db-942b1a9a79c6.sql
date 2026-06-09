
CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FAQs are viewable by everyone"
  ON public.faqs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert FAQs"
  ON public.faqs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update FAQs"
  ON public.faqs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete FAQs"
  ON public.faqs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.faqs (question, answer, sort_order, is_active) VALUES
  ('¿Con cuánta anticipación hay que hacer el pedido?', 'Todos nuestros productos se elaboran artesanalmente, por eso necesitamos un mínimo de 48 horas de anticipación para preparar tu pedido. Para tortas personalizadas o pedidos grandes, el plazo mínimo es de 72 horas.', 0, true),
  ('¿Cómo hago un pedido?', 'Podés hacer tu pedido directamente desde el catálogo o escribirnos por WhatsApp. Una vez confirmado el pedido, te enviamos los datos para abonar la seña y listo.', 1, true),
  ('¿Qué es la seña y por qué se pide?', 'La seña es un pago del 50% del total del pedido que reserva tu lugar en nuestra agenda. Como todos los productos son artesanales y se preparan especialmente para vos, la seña nos permite organizarnos y garantizarte el pedido. El saldo restante se abona el día del retiro.', 2, true),
  ('¿Qué medios de pago aceptan?', 'Aceptamos transferencia bancaria, Mercado Pago y efectivo. El efectivo solo se acepta en el momento del retiro.', 3, true),
  ('¿Hacen envíos a domicilio?', 'Por el momento no realizamos envíos. Todos los pedidos son para retiro en Rosario. Una vez confirmado tu pedido te informamos la dirección exacta. Nuestros horarios de retiro son de 9:00 a 12:00 y de 14:00 a 19:00.', 4, true),
  ('¿Puedo cancelar o reprogramar mi pedido?', 'Sí. Si cancelás con más de 48 horas de anticipación, te devolvemos la seña. Si cancelás con menos tiempo, la seña no es reembolsable. También podés reprogramar tu pedido para otra fecha sin perder la seña, sujeto a disponibilidad.', 5, true),
  ('¿Los productos tienen alérgenos?', 'Sí. Nuestros productos pueden contener trazas de gluten, lácteos, huevo y frutos secos. Si tenés alguna alergia o restricción alimentaria, por favor avisanos antes de hacer el pedido para que podamos orientarte.', 6, true),
  ('¿Hacen tortas personalizadas?', '¡Sí! Hacemos tortas personalizadas para cumpleaños, eventos y ocasiones especiales. Escribinos por WhatsApp o por el formulario de contacto y contanos tu idea.', 7, true);
