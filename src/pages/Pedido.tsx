import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/formatPrice';
import { WHATSAPP_NOTIFICATION_NUMBER, WHATSAPP_NUMBER } from '@/lib/constants';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import ProductImage from '@/components/ProductImage';
import SectionDivider from '@/components/SectionDivider';
import SEOHead from '@/components/SEOHead';
import HoneypotField from '@/components/HoneypotField';
import { isHoneypotFilled, isSubmissionTooFast, checkRateLimit } from '@/lib/antispam';

const PHONE_REGEX = /^[\d\s\-+()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getMinDate() {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
}

/** Parse business_hours string like "Mañana: 9:00 - 12:00 / Tarde: 12:00 - 18:00" into select options */
function parseHoursToOptions(hours: string): string[] {
    return hours.split('/').map(s => {
          const trimmed = s.trim();
          // Extract label and range, e.g. "Mañana: 9:00 - 12:00" -> "Mañana (9-12)"
                                    const match = trimmed.match(/^(.+?):\s*(\d{1,2}):?\d{0,2}\s*-\s*(\d{1,2}):?\d{0,2}$/);
          if (match) {
                  return `${match[1].trim()} (${match[2]}-${match[3]})`;
          }
          return trimmed;
    }).filter(Boolean);
}

export default function Pedido() {
    const { items, getCartTotal, clearCart, updateQuantity, removeFromCart } = useCart();
    const { data: settings } = useSiteSettings();

  const whatsappNumber = settings?.whatsapp_number || WHATSAPP_NUMBER;
    const whatsappNotification = settings?.whatsapp_number || WHATSAPP_NOTIFICATION_NUMBER;
    const pickupAddress = settings?.pickup_address || settings?.address || 'Rosario, Santa Fe';
    const businessHours = settings?.business_hours || 'Mañana: 9:00 - 12:00 / Tarde: 12:00 - 18:00';

  const timeOptions = useMemo(() => parseHoursToOptions(businessHours), [businessHours]);
    const defaultTime = timeOptions[0] || 'Mañana (9-12)';

  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', time: '', notes: '' });
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [success, setSuccess] = useState<{ id: string; name: string; date: string; time: string } | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [honeypot, setHoneypot] = useState('');
    const formLoadedAt = useRef(Date.now());

  // Set default time once settings load
  useEffect(() => {
        if (defaultTime && !form.time) {
                setForm(p => ({ ...p, time: defaultTime }));
        }
  }, [defaultTime]);

  useEffect(() => { formLoadedAt.current = Date.now(); }, []);

  const shouldBlock = items.length > 0 && !success;
    useEffect(() => {
          if (!shouldBlock) return;
          const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
          window.addEventListener('beforeunload', handler);
          return () => window.removeEventListener('beforeunload', handler);
    }, [shouldBlock]);

  useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
  }, [cooldown]);

  const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Ingresá tu nombre';
        if (!PHONE_REGEX.test(form.phone.trim())) e.phone = 'Ingresá un teléfono válido';
        if (!EMAIL_REGEX.test(form.email.trim())) e.email = 'Ingresá un email válido';
        if (!form.date) e.date = 'Seleccioná una fecha';
        else if (form.date < getMinDate()) e.date = 'Mínimo 48hs de anticipación';
        setErrors(e);
        return Object.keys(e).length === 0;
  };

  const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validate();
  };

  const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ name: true, phone: true, email: true, date: true });

        if (isHoneypotFilled(honeypot)) {
                toast.success('¡Pedido enviado con éxito!');
                return;
        }
        if (isSubmissionTooFast(formLoadedAt.current)) {
                toast.error('Por favor esperá un momento antes de enviar.');
                return;
        }
        if (!checkRateLimit('order')) {
                toast.error('Demasiados envíos. Por favor esperá un momento.');
                return;
        }
        if (!validate() || items.length === 0) return;

        setLoading(true);

        const { data: orderResult, error } = await supabase.functions.invoke('create-order', {
                body: {
                          customerName: form.name.trim(),
                          customerPhone: form.phone.trim(),
                          customerEmail: form.email.trim(),
                          desiredDate: form.date,
                          preferredTime: form.time,
                          notes: form.notes.trim(),
                          items: items.map(i => ({
                                      productId: i.productId,
                                      variantId: i.variantId || undefined,
                                      quantity: i.quantity
                          })),
                },
        });

        if (error || !orderResult?.success) {
                toast.error(orderResult?.error || 'Error al enviar el pedido. Intentá de nuevo.');
                setLoading(false);
                return;
        }

        const orderId = orderResult.orderId;
        const serverItems = orderResult.items;
        const serverTotal = orderResult.total;

        try {
                await supabase.functions.invoke('send-order-notification', {
                          body: {
                                      orderId: orderId.slice(0, 8).toUpperCase(),
                                      customerName: form.name.trim(),
                                      customerPhone: form.phone.trim(),
                                      customerEmail: form.email.trim(),
                                      desiredDate: form.date,
                                      preferredTime: form.time,
                                      notes: form.notes.trim(),
                                      items: serverItems,
                                      total: serverTotal,
                          },
                });
        } catch { /* non-blocking */ }

        const itemsList = (serverItems as any[]).map((i: any) =>
                `• ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity} - ${formatPrice(i.unitPrice * i.quantity)}`
                                                         ).join('\n');

        const waText = `🛒 Nuevo Pedido #${orderId.slice(0, 8).toUpperCase()}\n\n👤 ${form.name.trim()}\n📞 ${form.phone.trim()}\n📧 ${form.email.trim()}\n📅 Retiro: ${form.date} - ${form.time}\n${form.notes.trim() ? `📝 Notas: ${form.notes.trim()}\n` : ''}\n📦 Productos:\n${itemsList}\n\n💰 Total: ${formatPrice(serverTotal)}`;
        window.open(`https://wa.me/${whatsappNotification}?text=${encodeURIComponent(waText)}`, '_blank');

        clearCart();
        setHoneypot('');
        setSuccess({ id: orderId.slice(0, 8).toUpperCase(), name: form.name.trim(), date: form.date, time: form.time });
        setCooldown(30);
        setLoading(false);
  };

  if (success) {
        const waMsg = `¡Hola! Acabo de hacer el pedido #${success.id} en la web. Mi nombre es ${success.name}. Retiro el ${success.date} en horario ${success.time}.`;
        return (
                <section className="pt-[72px]">
                        <div className="py-20 px-4">
                                  <div className="container max-w-lg text-center">
                                              <div className="text-5xl mb-4">🎉</div>
                                              <h1 className="font-display text-3xl font-bold text-espresso">¡Pedido enviado con éxito!</h1>
                                              <p className="text-espresso/70 mt-4">Pedido #{success.id}</p>
                                              <p className="text-espresso/70 mt-2 leading-relaxed">
                                                            Te contactaremos por WhatsApp o teléfono para confirmar tu pedido y coordinar el pago.
                                              </p>
                                              <a
                                                              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMsg)}`}
                                                              target="_blank" rel="noopener noreferrer"
                                                              className="inline-flex items-center gap-2 mt-6 rounded-full bg-[#25D366] text-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-[#1da851] transition-all active:scale-95"
                                                            >
                                                            💬 Enviar mensaje por WhatsApp
                                              </a>
                                              <Link to="/" className="block mt-4 text-dusty-pink hover:text-mauve font-semibold transition-colors">
                                                            Volver al Inicio
                                              </Link>
                                  </div>
                        </div>
                </section>
              );
  }
  
    if (items.length === 0) {
          return (
                  <section className="pt-[72px]">
                          <div className="py-20 px-4 text-center">
                                    <ShoppingBag size={64} className="mx-auto text-warm-gray/30 mb-4" />
                                    <h1 className="font-display text-3xl font-bold text-espresso">Tu carrito está vacío</h1>
                                    <p className="text-espresso/70 mt-3">Agregá productos desde nuestro catálogo para armar tu pedido.</p>
                                    <Link to="/catalogo" className="inline-block mt-6 text-dusty-pink hover:text-mauve font-semibold transition-colors">
                                                Ver catálogo →
                                    </Link>
                          </div>
                  </section>
                );
    }
  
    const inputBase = 'w-full rounded-xl border bg-soft-white px-4 py-3 text-sm text-espresso placeholder:text-warm-gray/60 focus:outline-none focus:ring-2 transition-all';
    const getInputClass = (field: string) => `${inputBase} ${touched[field] && errors[field] ? 'border-red-400 focus:ring-red-300/30' : 'border-input focus:ring-dusty-pink/30'}`;
  
    return (
          <section className="pt-[72px]">
                <SEOHead
                          title="Pedido | Le Sucrée Pastelería"
                          description="Confirmá tu pedido de tortas, cookies y postres artesanales. Retiro en Rosario con 48hs de anticipación."
                          path="/pedido"
                        />
                <div className="py-16 md:py-20 px-4">
                        <div className="container">
                                  <h1 className="font-display text-[32px] md:text-[40px] font-bold text-espresso text-center">Confirmar tu Pedido</h1>
                                  <SectionDivider />
                                  <p className="text-center text-sm text-espresso/60 mt-4 mb-12">Retiro en local — {pickupAddress}</p>
                        
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
                                    {/* Form */}
                                              <form onSubmit={handleSubmit} className="space-y-4">
                                                            <HoneypotField value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                                              
                                                            <div>
                                                                            <label htmlFor="pedido-name" className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Nombre completo *</label>
                                                                            <input id="pedido-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} onBlur={() => handleBlur('name')} className={getInputClass('name')} maxLength={100} />
                                                              {touched.name && errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                                                            </div>
                                              
                                                            <div>
                                                                            <label htmlFor="pedido-phone" className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Teléfono *</label>
                                                                            <input id="pedido-phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} onBlur={() => handleBlur('phone')} className={getInputClass('phone')} placeholder="+54 341..." maxLength={20} />
                                                              {touched.phone && errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                                                            </div>
                                              
                                                            <div>
                                                                            <label htmlFor="pedido-email" className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Email *</label>
                                                                            <input id="pedido-email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} onBlur={() => handleBlur('email')} className={getInputClass('email')} maxLength={255} />
                                                              {touched.email && errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                                                            </div>
                                              
                                                            <div>
                                                                            <label htmlFor="pedido-date" className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Fecha de retiro *</label>
                                                                            <input id="pedido-date" type="date" min={getMinDate()} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} onBlur={() => handleBlur('date')} className={getInputClass('date')} />
                                                              {touched.date && errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
                                                            </div>
                                              
                                                            <div>
                                                                            <label htmlFor="pedido-time" className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Horario preferido *</label>
                                                                            <select id="pedido-time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className={`${inputBase} border-input focus:ring-dusty-pink/30`}>
                                                                              {timeOptions.map(opt => (
                                <option key={opt}>{opt}</option>
                              ))}
                                                                            </select>
                                                            </div>
                                              
                                                            <div>
                                                                            <label htmlFor="pedido-notes" className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Notas adicionales</label>
                                                                            <textarea id="pedido-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value.slice(0, 500) }))} className={`${inputBase} border-input focus:ring-dusty-pink/30 min-h-[80px] resize-none`} maxLength={500} placeholder="Indicaciones especiales, alergias, dedicatorias..." />
                                                                            <span className="text-xs text-warm-gray/50">{form.notes.length}/500</span>
                                                            </div>
                                              
                                                            <button type="submit" disabled={loading || cooldown > 0} className="w-full rounded-full bg-dusty-pink text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-mauve hover:scale-[1.02] transition-all duration-300 active:scale-95 disabled:opacity-60 mt-4">
                                                              {loading ? 'Enviando...' : cooldown > 0 ? `Esperá ${cooldown}s` : 'Enviar Pedido'}
                                                            </button>
                                              </form>
                                  
                                    {/* Order summary - sticky */}
                                              <div className="lg:sticky lg:top-[100px] self-start">
                                                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blush">
                                                                            <h3 className="font-display text-lg font-bold text-espresso mb-4">Resumen del Pedido</h3>
                                                                            <div className="space-y-3">
                                                                              {items.map(item => (
                                <div key={`${item.productId}-${item.variantId || ''}`} className="flex gap-3">
                                                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                                                              <ProductImage src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                                              <p className="text-sm font-semibold text-espresso truncate">{item.productName}</p>
                                                        {item.variantLabel && <p className="text-xs text-warm-gray">{item.variantLabel}</p>}
                                                                              <div className="flex items-center gap-2 mt-1">
                                                                                                        <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} className="w-6 h-6 rounded-full border border-warm-gray/30 flex items-center justify-center text-warm-gray hover:border-dusty-pink hover:text-dusty-pink transition-colors">
                                                                                                                                    <Minus size={10} />
                                                                                                          </button>
                                                                                                        <span className="text-xs font-semibold text-espresso w-4 text-center">{item.quantity}</span>
                                                                                                        <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)} className="w-6 h-6 rounded-full border border-warm-gray/30 flex items-center justify-center text-warm-gray hover:border-dusty-pink hover:text-dusty-pink transition-colors">
                                                                                                                                    <Plus size={10} />
                                                                                                          </button>
                                                                                                        <button onClick={() => removeFromCart(item.productId, item.variantId)} className="ml-auto p-1 text-warm-gray/40 hover:text-red-500 transition-colors">
                                                                                                                                    <Trash2 size={13} />
                                                                                                          </button>
                                                                                </div>
                                                      </div>
                                                      <p className="text-sm font-semibold text-espresso">{formatPrice(item.price * item.quantity)}</p>
                                </div>
                              ))}
                                                                            </div>
                                                                            <div className="border-t border-blush mt-4 pt-4 flex items-center justify-between">
                                                                                              <span className="font-body font-semibold text-warm-gray">Subtotal</span>
                                                                                              <span className="font-display text-xl font-bold text-espresso">{formatPrice(getCartTotal())}</span>
                                                                            </div>
                                                                            <p className="text-xs text-warm-gray mt-3">Los pedidos se reservan con un 50% de seña en efectivo o transferencia.</p>
                                                            </div>
                                              </div>
                                  </div>
                        </div>
                </div>
          </section>
        );
}</section>
