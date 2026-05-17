import { useState, useEffect, useRef } from 'react';
import { Instagram, MapPin, Clock, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WHATSAPP_NUMBER, WHATSAPP_NOTIFICATION_NUMBER, INSTAGRAM_URL, INSTAGRAM_HANDLE } from '@/lib/constants';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import SectionDivider from '@/components/SectionDivider';
import SEOHead from '@/components/SEOHead';
import HoneypotField from '@/components/HoneypotField';
import { isHoneypotFilled, isSubmissionTooFast, checkRateLimit } from '@/lib/antispam';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 1000;

export default function Contacto() {
    const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [honeypot, setHoneypot] = useState('');
    const formLoadedAt = useRef(Date.now());
    const { data: settings } = useSiteSettings();

  const whatsappNumber = settings?.whatsapp_number || WHATSAPP_NUMBER;
    const whatsappUrl = `https://wa.me/${whatsappNumber}`;
    const whatsappNotification = settings?.whatsapp_number || WHATSAPP_NOTIFICATION_NUMBER;
    const instagramUrl = settings?.instagram_url || INSTAGRAM_URL;
    const instagramHandle = settings?.instagram_handle || INSTAGRAM_HANDLE;
    const address = settings?.address || 'Rosario, Santa Fe, Argentina';
    const businessHours = settings?.business_hours || 'Mañana: 9:00 - 12:00 / Tarde: 12:00 - 18:00';

  useEffect(() => { formLoadedAt.current = Date.now(); }, []);

  useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isHoneypotFilled(honeypot)) {
                toast.success('¡Mensaje enviado! Te responderemos pronto.');
                return;
        }
        if (isSubmissionTooFast(formLoadedAt.current)) {
                toast.error('Por favor esperá un momento antes de enviar.');
                return;
        }
        if (!checkRateLimit('contact')) {
                toast.error('Demasiados envíos. Por favor esperá un momento.');
                return;
        }

        const name = form.name.trim();
        const email = form.email.trim();
        const message = form.message.trim();

        if (!name || !email || !message) {
                toast.error('Por favor completá todos los campos obligatorios');
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

        const { data: result, error } = await supabase.functions.invoke('create-contact-message', {
                body: { name, email, message },
        });

        setLoading(false);

        if (error || !result?.success) {
                toast.error(result?.error || 'Error al enviar el mensaje');
        } else {
                // Notification is dispatched server-side by create-contact-message.

          toast.success('¡Mensaje enviado! Te responderemos pronto.');

          const waText = `📩 Nuevo mensaje de contacto\n\n👤 Nombre: ${name}\n📧 Email: ${email}${form.phone.trim() ? `\n📞 Tel: ${form.phone.trim()}` : ''}\n💬 Mensaje: ${message}`;
                window.open(`https://wa.me/${whatsappNotification}?text=${encodeURIComponent(waText)}`, '_blank');

          setForm({ name: '', email: '', phone: '', message: '' });
                setHoneypot('');
                setCooldown(30);
        }
  };

  const inputClass = 'w-full rounded-xl border border-input bg-soft-white px-4 py-3 text-sm text-espresso placeholder:text-warm-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-pink/30 transition-all';
    const isDisabled = loading || cooldown > 0;

  // Parse business hours into lines for display
  const hoursLines = businessHours.split('/').map(s => s.trim()).filter(Boolean);

  return (
        <section className="pt-[72px]">
              <SEOHead
                        title="Contacto | Le Sucrée Pastelería"
                        description="Contactanos por WhatsApp, Instagram o el formulario. Pedidos con 48hs de anticipación. Rosario, Santa Fe."
                        path="/contacto"
                      />
        
              <div className="py-10 sm:py-16 md:py-20 px-3 sm:px-4">
                      <div className="container">
                                <h1 className="font-script text-[32px] sm:text-[40px] md:text-[52px] text-espresso text-center">Contacto</h1>
                                <SectionDivider />
                      
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 mt-8 sm:mt-12 max-w-4xl mx-auto">
                  {/* WhatsApp primary + Info */}
                            <div className="space-y-8">
                                      {/* WhatsApp CTA — primary action */}
                                      <div className="bg-[#25D366]/10 rounded-2xl p-6 text-center">
                                                <h3 className="font-body text-sm uppercase tracking-[0.08em] font-semibold text-espresso mb-2">La forma más rápida de pedir</h3>
                                                <p className="text-sm text-espresso/70 mb-4">Escribime por WhatsApp y te respondo enseguida</p>
                                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-10 py-4 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-[#1da851] hover:scale-[1.02] transition-all duration-300 active:scale-95 shadow-lg">
                                                          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                                          Chatear
                                                </a>
                                      </div>

                                      <div>
                                                <h3 className="font-body text-xs uppercase tracking-[0.08em] text-warm-gray">También podés encontrarme en</h3>
                                                <div className="mt-4 space-y-3">
                                                          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-espresso/70 hover:text-dusty-pink transition-colors" aria-label="Instagram de Le Sucrée">
                                                                      <Instagram size={18} /> {instagramHandle}
                                                          </a>
                                                          <a href={`tel:+${whatsappNumber}`} className="flex items-center gap-3 text-espresso/70 hover:text-dusty-pink transition-colors">
                                                                      <Phone size={18} /> +54 9 341 274-1229
                                                          </a>
                                                </div>
                                      </div>
                            
                                      <div>
                                                <h3 className="font-body text-xs uppercase tracking-[0.08em] text-warm-gray">Ubicación</h3>
                                                <div className="mt-3 flex items-start gap-3 text-espresso/70">
                                                          <MapPin size={18} className="flex-shrink-0 mt-0.5" />
                                                          <p className="text-sm leading-relaxed">{address}</p>
                                                </div>
                                      </div>
                            
                                      <div>
                                                <h3 className="font-body text-xs uppercase tracking-[0.08em] text-warm-gray">Horarios de retiro</h3>
                                                <div className="mt-3 flex items-start gap-3 text-espresso/70">
                                                          <Clock size={18} className="flex-shrink-0 mt-0.5" />
                                                          <div className="text-sm leading-relaxed">
                                                            {hoursLines.map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                                                                        <p className="mt-1 text-xs text-warm-gray/70">Pedidos con al menos 48hs de anticipación</p>
                                                          </div>
                                                </div>
                                      </div>
                            </div>
                
                  {/* Form — de-prioritized */}
                            <div>
                              <p className="text-xs text-warm-gray mb-3 uppercase tracking-wider font-semibold">O dejame un mensaje</p>
                              <form onSubmit={handleSubmit} className="space-y-4">
                                        <HoneypotField value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                            
                                        <div>
                                                    <label htmlFor="contacto-name" className="sr-only">Nombre</label>
                                                    <input id="contacto-name" type="text" placeholder="Nombre *" aria-label="Nombre" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} maxLength={100} />
                                        </div>
                            
                                        <div>
                                                    <label htmlFor="contacto-email" className="sr-only">Email</label>
                                                    <input id="contacto-email" type="email" placeholder="Email *" aria-label="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass} maxLength={255} />
                                        </div>
                            
                                        <div>
                                                    <label htmlFor="contacto-phone" className="sr-only">Teléfono</label>
                                                    <input id="contacto-phone" type="tel" placeholder="Teléfono (opcional)" aria-label="Teléfono" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} maxLength={20} />
                                        </div>
                            
                                        <div className="relative">
                                                    <label htmlFor="contacto-message" className="sr-only">Mensaje</label>
                                                    <textarea id="contacto-message" placeholder="Mensaje *" aria-label="Mensaje" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value.slice(0, MAX_MESSAGE_LENGTH) }))} className={`${inputClass} min-h-[120px] resize-none`} maxLength={MAX_MESSAGE_LENGTH} />
                                                    <span className="absolute bottom-2 right-3 text-xs text-warm-gray/50">{form.message.length}/{MAX_MESSAGE_LENGTH}</span>
                                        </div>
                            
                                        <button type="submit" disabled={isDisabled} className="w-full rounded-full bg-dusty-pink text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-mauve hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(212,166,154,0.3)] transition-all duration-300 active:scale-95 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none">
                                          {loading ? 'Enviando...' : cooldown > 0 ? `Esperá ${cooldown}s` : 'Enviar Mensaje'}
                                        </button>
                              </form>
                            </div>
                </div>
                      </div>
              </div>
        </section>
      );
}
