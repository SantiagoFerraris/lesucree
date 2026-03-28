import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/formatPrice';
import { WHATSAPP_NOTIFICATION_NUMBER } from '@/lib/constants';
import ProductImage from '@/components/ProductImage';
import SectionDivider from '@/components/SectionDivider';
import HoneypotField from '@/components/HoneypotField';
import { isHoneypotFilled, isSubmissionTooFast, checkRateLimit } from '@/lib/antispam';

const PHONE_REGEX = /^[\d\s\-+()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split('T')[0];
}

export default function Pedido() {
  const { items, getCartTotal, clearCart } = useCart();
  const [form, setForm] = useState({
    name: '', phone: '', email: '', date: '', time: 'Mañana (9-12)', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState('');
  const formLoadedAt = useRef(Date.now());

  useEffect(() => {
    formLoadedAt.current = Date.now();
  }, []);

  // Warn before closing/refreshing when cart has items
  const shouldBlock = items.length > 0 && !success;

  useEffect(() => {
    if (!shouldBlock) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Anti-spam checks
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
    // Submit order via secure edge function (server-side price validation)
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
          quantity: i.quantity,
        })),
      },
    });

    if (error || !orderResult?.success) {
      console.error('Order error:', error || orderResult?.error);
      toast.error(orderResult?.error || 'Error al enviar el pedido. Intentá de nuevo.');
      setLoading(false);
      return;
    }

    const orderId = orderResult.orderId;
    const serverItems = orderResult.items;
    const serverTotal = orderResult.total;

    // Send email notification via edge function
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
    } catch {
      // Non-blocking — order is saved even if email fails
    }

    const itemsList = (serverItems as any[]).map((i: any) => `• ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity} - ${formatPrice(i.unitPrice * i.quantity)}`).join('\n');
    const waText = `🛒 Nuevo Pedido #${orderId.slice(0, 8).toUpperCase()}\n\n👤 ${form.name.trim()}\n📞 ${form.phone.trim()}\n📧 ${form.email.trim()}\n📅 Retiro: ${form.date} - ${form.time}\n${form.notes.trim() ? `📝 Notas: ${form.notes.trim()}\n` : ''}\n📦 Productos:\n${itemsList}\n\n💰 Total: ${formatPrice(serverTotal)}`;
    window.open(`https://wa.me/${WHATSAPP_NOTIFICATION_NUMBER}?text=${encodeURIComponent(waText)}`, '_blank');

    clearCart();
    setHoneypot('');
    setSuccess(orderId.slice(0, 8).toUpperCase());
    setCooldown(30);
    setLoading(false);
  };

  if (success) {
    return (
      <section className="pt-[72px]">
        <div className="py-20 px-4">
          <div className="container max-w-lg text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="font-display text-3xl font-bold text-espresso">¡Pedido enviado con éxito!</h1>
            <p className="text-warm-gray mt-4">Pedido #{success}</p>
            <p className="text-warm-gray mt-2 leading-relaxed">
              Te contactaremos por WhatsApp o teléfono para confirmar tu pedido y coordinar el pago.
            </p>
            <Link
              to="/"
              className="inline-block mt-8 rounded-full bg-dusty-pink text-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-mauve transition-all active:scale-95"
            >
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
          <p className="text-warm-gray mt-3">Agregá productos desde nuestro catálogo para armar tu pedido.</p>
          <Link to="/catalogo" className="inline-block mt-6 text-dusty-pink hover:text-mauve font-semibold transition-colors">
            Ver catálogo →
          </Link>
        </div>
      </section>
    );
  }

  const inputClass = 'w-full rounded-xl border border-input bg-soft-white px-4 py-3 text-sm text-espresso placeholder:text-warm-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-pink/30 transition-all';

  return (
    <section className="pt-[72px]">

      <div className="py-16 md:py-20 px-4">
        <div className="container">
          <h1 className="font-display text-[32px] md:text-[40px] font-bold text-espresso text-center">Confirmar tu Pedido</h1>
          <SectionDivider />

          <p className="text-center text-sm text-warm-gray mt-4 mb-12">
            Retiro en local — Rosario, Santa Fe
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <HoneypotField value={honeypot} onChange={e => setHoneypot(e.target.value)} />
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Nombre completo *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} maxLength={100} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Teléfono *</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} placeholder="+54 341..." maxLength={20} />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass} maxLength={255} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Fecha de retiro *</label>
                <input type="date" min={getMinDate()} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputClass} />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Horario preferido *</label>
                <select value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className={inputClass}>
                  <option>Mañana (9-12)</option>
                  <option>Tarde (12-18)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Notas adicionales</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value.slice(0, 500) }))} className={`${inputClass} min-h-[80px] resize-none`} maxLength={500} placeholder="Indicaciones especiales, alergias, dedicatorias..." />
                <span className="text-xs text-warm-gray/50">{form.notes.length}/500</span>
              </div>
              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full rounded-full bg-dusty-pink text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-mauve hover:scale-[1.02] transition-all duration-300 active:scale-95 disabled:opacity-60 mt-4"
              >
                {loading ? 'Enviando...' : cooldown > 0 ? `Esperá ${cooldown}s` : 'Enviar Pedido'}
              </button>
            </form>

            {/* Order summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blush h-fit">
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
                      <p className="text-xs text-warm-gray">x{item.quantity}</p>
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
    </section>
  );
}
