import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SectionDivider from '@/components/SectionDivider';
import SEOHead from '@/components/SEOHead';
import HoneypotField from '@/components/HoneypotField';
import { isHoneypotFilled, isSubmissionTooFast, checkRateLimit } from '@/lib/antispam';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 500;

type StudentChoice = '' | 'si' | 'no';

export default function Zumbita() {
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', message: '' });
  const [isStudent, setIsStudent] = useState<StudentChoice>('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [honeypot, setHoneypot] = useState('');
  const formLoadedAt = useRef(Date.now());

  useEffect(() => { formLoadedAt.current = Date.now(); }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const isNotStudent = isStudent === 'no';
  const canSubmit = isStudent === 'si' && !loading && cooldown === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isHoneypotFilled(honeypot)) { setSubmitted(true); return; }
    if (isSubmissionTooFast(formLoadedAt.current)) {
      toast.error('Por favor esperá un momento antes de enviar.');
      return;
    }
    if (!checkRateLimit('zumbita')) {
      toast.error('Demasiados envíos. Por favor esperá un momento.');
      return;
    }

    const name = form.name.trim();
    const email = form.email.trim();
    const whatsapp = form.whatsapp.trim();
    const message = form.message.trim();

    if (!name || !email || !whatsapp) {
      toast.error('Completá nombre, email y WhatsApp');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      toast.error('Ingresá un email válido');
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      toast.error(`El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres`);
      return;
    }

    setLoading(true);

    const { error } = await (supabase.from('zumbita_discount_requests' as any) as any).insert({
      customer_name: name,
      email,
      whatsapp,
      message: message || null,
      is_zumbita_student: true,
      status: 'pending',
    });

    setLoading(false);

    if (error) {
      console.error('Zumbita submit error:', error.message);
      toast.error('No pudimos enviar tu solicitud. Intentá de nuevo.');
      return;
    }

    toast.success('¡Solicitud enviada! Te vamos a contactar pronto.');
    setSubmitted(true);
    setForm({ name: '', email: '', whatsapp: '', message: '' });
    setHoneypot('');
    setCooldown(30);
  };

  const inputClass =
    'w-full rounded-xl border border-input bg-soft-white px-4 py-3 text-sm text-espresso placeholder:text-warm-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-pink/30 transition-all disabled:opacity-60';

  return (
    <section className="pt-[72px]">
      <SEOHead
        title="Beneficio Zumbita | Le Sucrée Pastelería"
        description="Beneficio exclusivo para alumnas de Zumbita. Solicitá tu descuento completando el formulario."
        path="/zumbita"
      />

      <div className="py-10 sm:py-16 md:py-20 px-3 sm:px-4">
        <div className="container max-w-2xl">
          <h1 className="font-script text-[32px] sm:text-[40px] md:text-[52px] text-espresso text-center">
            Beneficio Zumbita
          </h1>
          <SectionDivider />

          <div className="text-center mt-6 sm:mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-dusty-pink/15 text-dusty-pink text-xs uppercase tracking-[0.12em] font-semibold">
              <Sparkles size={14} /> Exclusivo para alumnas
            </div>
            <p className="text-warm-gray mt-4 leading-relaxed text-[15px] sm:text-base max-w-lg mx-auto">
              Si sos alumna de Zumbita, tenés un descuento especial en tus pedidos.
              Completá el formulario y te contacto para coordinar.
            </p>
          </div>

          <div className="mt-8 sm:mt-10 bg-soft-white rounded-2xl border border-blush/40 shadow-sm p-5 sm:p-8">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-sage/20 flex items-center justify-center">
                  <Sparkles size={24} className="text-sage" />
                </div>
                <h2 className="font-display text-xl font-bold text-espresso">¡Listo!</h2>
                <p className="text-sm text-warm-gray mt-2 max-w-sm mx-auto">
                  Recibí tu solicitud. Te voy a escribir por WhatsApp en las próximas horas con los detalles del beneficio.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-xs uppercase tracking-[0.1em] font-semibold text-dusty-pink hover:text-mauve transition-colors"
                >
                  Enviar otra solicitud
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <HoneypotField value={honeypot} onChange={e => setHoneypot(e.target.value)} />

                {/* Required student question */}
                <div>
                  <label className="block text-xs font-semibold text-espresso uppercase tracking-wider mb-2">
                    ¿Sos alumna de Zumbita? *
                  </label>
                  <div className="flex gap-2">
                    {(['si', 'no'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setIsStudent(opt)}
                        className={`flex-1 px-4 py-2.5 rounded-full text-sm font-semibold border-[1.5px] transition-all duration-300 active:scale-95 ${
                          isStudent === opt
                            ? 'bg-dusty-pink text-white border-dusty-pink'
                            : 'border-espresso/30 text-espresso hover:border-dusty-pink hover:text-dusty-pink'
                        }`}
                      >
                        {opt === 'si' ? 'Sí' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                {isNotStudent && (
                  <div className="rounded-xl bg-blush/40 border border-dusty-pink/30 p-4 text-center animate-fade-in">
                    <p className="text-sm text-espresso leading-relaxed">
                      Este beneficio es <strong>exclusivo para alumnas de Zumbita</strong>. 
                      ¡Igual te invito a ver nuestro catálogo o a escribirme por WhatsApp! 💛
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="zumbita-name" className="sr-only">Nombre completo</label>
                  <input
                    id="zumbita-name"
                    type="text"
                    placeholder="Nombre completo *"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className={inputClass}
                    maxLength={100}
                    disabled={isNotStudent}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="zumbita-email" className="sr-only">Email</label>
                  <input
                    id="zumbita-email"
                    type="email"
                    placeholder="Email *"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className={inputClass}
                    maxLength={255}
                    disabled={isNotStudent}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="zumbita-whatsapp" className="sr-only">WhatsApp</label>
                  <input
                    id="zumbita-whatsapp"
                    type="tel"
                    placeholder="WhatsApp *"
                    value={form.whatsapp}
                    onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                    className={inputClass}
                    maxLength={20}
                    disabled={isNotStudent}
                    required
                  />
                </div>

                <div className="relative">
                  <label htmlFor="zumbita-message" className="sr-only">Mensaje</label>
                  <textarea
                    id="zumbita-message"
                    placeholder="Mensaje (opcional)"
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value.slice(0, MAX_MESSAGE_LENGTH) }))}
                    className={`${inputClass} min-h-[100px] resize-none`}
                    maxLength={MAX_MESSAGE_LENGTH}
                    disabled={isNotStudent}
                  />
                  <span className="absolute bottom-2 right-3 text-xs text-warm-gray/50">
                    {form.message.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-full bg-dusty-pink text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-mauve hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(212,166,154,0.3)] transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none"
                >
                  {loading
                    ? 'Enviando...'
                    : cooldown > 0
                      ? `Esperá ${cooldown}s`
                      : isStudent === ''
                        ? 'Indicá si sos alumna'
                        : isNotStudent
                          ? 'Beneficio no disponible'
                          : 'Solicitar beneficio'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
