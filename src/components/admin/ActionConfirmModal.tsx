import { useState } from 'react';
import { X, Loader2, Copy, Download, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildWhatsAppUrl, generateProductionList } from '@/lib/insightEngine';
import { formatPrice } from '@/lib/formatPrice';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface Props {
  open: boolean;
  onClose: () => void;
  variant: 'whatsapp' | 'product_actions' | 'promo_draft' | 'production_list' | 'cancel_order';
  data?: any;
  onActionComplete?: (logEntry: { action_type: string; description: string; related_entity_type?: string; related_entity_id?: string; metadata?: any }) => void;
}

export default function ActionConfirmModal({ open, onClose, variant, data, onActionComplete }: Props) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-lg md:rounded-xl rounded-t-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
        {variant === 'whatsapp' && <WhatsAppVariant data={data} onClose={onClose} onActionComplete={onActionComplete} loading={loading} setLoading={setLoading} />}
        {variant === 'product_actions' && <ProductActionsVariant data={data} onClose={onClose} onActionComplete={onActionComplete} loading={loading} setLoading={setLoading} />}
        {variant === 'promo_draft' && <PromoDraftVariant data={data} onClose={onClose} onActionComplete={onActionComplete} loading={loading} setLoading={setLoading} />}
        {variant === 'production_list' && <ProductionListVariant data={data} onClose={onClose} onActionComplete={onActionComplete} />}
        {variant === 'cancel_order' && <CancelOrderVariant data={data} onClose={onClose} onActionComplete={onActionComplete} loading={loading} setLoading={setLoading} />}
      </div>
    </div>
  );
}

// ==================== VARIANT A: WhatsApp ====================
function WhatsAppVariant({ data, onClose, onActionComplete, loading, setLoading }: any) {
  const templates: Record<string, (d: any) => string> = {
    reactivation: (d) => `¡Hola ${d.name}! 🎂 Soy de Le Sucrée Pastelería. Hace un tiempo pediste ${d.lastProduct || 'algo rico'} y queríamos saber si te gustó. Tenemos novedades que te pueden interesar. ¡Esperamos verte pronto!`,
    thank_you: (d) => `¡Hola ${d.name}! 🤎 Queríamos agradecerte por elegirnos siempre. ¡Sos parte de la familia Le Sucrée! Para tu próximo pedido, consultanos por novedades.`,
    payment_reminder: (d) => `¡Hola ${d.name}! Te recordamos que tu pedido de ${d.product || 'Le Sucrée'} para retirar el ${d.desiredDate || ''} a las ${d.preferredTime || ''} tiene pago pendiente. Podés hacer la seña del 50% (${formatPrice((d.amount || 0) / 2)}) por transferencia. ¡Gracias! 🤎`,
    confirm: (d) => `¡Hola ${d.name}! 🎂 Confirmamos tu pedido de Le Sucrée. ¡Te esperamos! 🤎`,
    reminder: (d) => `¡Hola ${d.name}! 🎂 Te recordamos que tu pedido de Le Sucrée está listo para retirar. ¡Te esperamos! 🤎`,
  };

  const clients = data?.clients || [{ name: data?.name, phone: data?.phone, email: data?.email, lastProduct: data?.lastProduct || data?.product }];
  const template = data?.template || 'reactivation';
  const [message, setMessage] = useState(() => templates[template]?.(clients[0]) || templates.reactivation(clients[0]));

  const handleSend = () => {
    setLoading(true);
    setTimeout(() => {
      clients.forEach((c: any, i: number) => {
        setTimeout(() => {
          window.open(buildWhatsAppUrl(c.phone, message.replace(c.name === clients[0].name ? '' : clients[0].name, c.name)), '_blank');
        }, i * 1000);
      });
      onActionComplete?.({
        action_type: 'whatsapp_sent',
        description: `Mensaje de ${template === 'thank_you' ? 'agradecimiento' : template === 'reactivation' ? 'reactivación' : 'contacto'} abierto en WhatsApp para ${clients.map((c: any) => c.name).join(', ')}`,
        related_entity_type: 'customer',
        metadata: { message, clients: clients.map((c: any) => c.name), template },
      });
      toast.success(`WhatsApp abierto para ${clients[0].name} ✓`, { duration: 4000 });
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-espresso">Enviar mensaje a {clients.length > 1 ? `${clients.length} clientes` : clients[0]?.name}</h3>
        <button onClick={onClose} className="text-warm-gray hover:text-espresso"><X size={18} /></button>
      </div>
      <p className="text-xs text-warm-gray mb-1">📝 Preview:</p>
      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30 resize-none" />
      {clients.length > 1 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-warm-gray font-semibold">Destinatarios:</p>
          {clients.map((c: any) => (
            <div key={c.phone} className="flex items-center gap-2 text-xs text-espresso">
              <MessageCircle size={12} className="text-green-600" /> {c.name} — {c.phone}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-warm-gray mt-3">📱 Se abrirá WhatsApp Web con este mensaje. Vos decidís si lo enviás.</p>
      {clients[0]?.phone && <p className="text-xs text-warm-gray mt-1">Tel: {clients[0].phone}</p>}
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-warm-gray hover:bg-gray-50">Cancelar</button>
        <button onClick={handleSend} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-[#8B6F4E] text-white text-sm font-semibold hover:bg-[#7A5F3E] disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          {loading ? 'Abriendo...' : `Abrir WhatsApp${clients.length > 1 ? ` para ${clients.length} clientes` : ' con este mensaje'}`}
        </button>
      </div>
    </>
  );
}

// ==================== VARIANT B: Product Actions ====================
function ProductActionsVariant({ data, onClose, onActionComplete, loading, setLoading }: any) {
  const [actions, setActions] = useState<Record<string, 'none' | 'featured' | 'deactivate'>>(() => {
    const map: Record<string, 'none' | 'featured' | 'deactivate'> = {};
    data?.products?.forEach((p: any) => { map[p.id] = 'none'; });
    return map;
  });

  const hasChanges = Object.values(actions).some(a => a !== 'none');

  const handleApply = async () => {
    setLoading(true);
    const changes: string[] = [];
    for (const [id, action] of Object.entries(actions)) {
      if (action === 'none') continue;
      const product = data.products.find((p: any) => p.id === id);
      if (action === 'featured') {
        await supabase.from('products').update({ featured: true } as any).eq('id', id);
        changes.push(`'${product.name}' marcado como destacado`);
      } else if (action === 'deactivate') {
        await supabase.from('products').update({ active: false } as any).eq('id', id);
        changes.push(`'${product.name}' desactivado`);
      }
    }
    changes.forEach(c => {
      onActionComplete?.({
        action_type: c.includes('destacado') ? 'product_highlighted' : 'product_deactivated',
        description: `Producto ${c} desde el asistente`,
        related_entity_type: 'product',
      });
    });
    toast.success(`${changes.length} cambio${changes.length > 1 ? 's' : ''} aplicado${changes.length > 1 ? 's' : ''} ✓`, { duration: 4000 });
    setLoading(false);
    onClose();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-espresso">Gestionar productos sin ventas</h3>
        <button onClick={onClose} className="text-warm-gray hover:text-espresso"><X size={18} /></button>
      </div>
      <div className="space-y-3 mb-4">
        {data?.products?.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between bg-cream/30 rounded-lg p-3">
            <span className="text-sm text-espresso font-medium">{p.name}</span>
            <div className="flex gap-1.5">
              {(['none', 'featured', 'deactivate'] as const).map(action => (
                <button key={action} onClick={() => setActions(prev => ({ ...prev, [p.id]: action }))}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${actions[p.id] === action
                    ? action === 'featured' ? 'bg-amber-100 text-amber-800' : action === 'deactivate' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                    : 'bg-white text-warm-gray border border-gray-200 hover:bg-gray-50'}`}>
                  {action === 'none' ? 'No hacer nada' : action === 'featured' ? 'Destacar' : 'Desactivar'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-warm-gray">ℹ️ Los productos desactivados dejarán de mostrarse en el catálogo. Los destacados aparecerán en "Nuestros Favoritos".</p>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-warm-gray hover:bg-gray-50">Cancelar</button>
        <button onClick={handleApply} disabled={loading || !hasChanges} className="flex-1 px-4 py-2.5 rounded-lg bg-[#8B6F4E] text-white text-sm font-semibold hover:bg-[#7A5F3E] disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          Aplicar cambios seleccionados
        </button>
      </div>
    </>
  );
}

// ==================== VARIANT C: Promo Draft ====================
function PromoDraftVariant({ data, onClose, onActionComplete, loading, setLoading }: any) {
  const [form, setForm] = useState({
    name: `Promo ${DAY_NAMES[data?.dayOfWeek || 1]}`,
    dayOfWeek: data?.dayOfWeek || 1,
    discountType: 'percentage',
    discountValue: '10',
    description: `¡${DAY_NAMES[data?.dayOfWeek || 1]} dulce en Le Sucrée! Pedí con descuento solo hoy 🤎`,
  });

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from('promotions').insert({
      name: form.name,
      day_of_week: form.dayOfWeek,
      discount_type: form.discountType,
      discount_value: parseFloat(form.discountValue) || null,
      description: form.description,
      status: 'draft',
    } as any);
    if (error) { toast.error('Error al guardar borrador'); setLoading(false); return; }
    onActionComplete?.({
      action_type: 'promo_drafted',
      description: `Borrador de promo '${form.name}' creado para los ${DAY_NAMES[form.dayOfWeek].toLowerCase()}`,
      related_entity_type: 'promotion',
      metadata: { name: form.name, dayOfWeek: form.dayOfWeek, discountType: form.discountType },
    });
    toast.success(`Borrador "${form.name}" guardado ✓`, { duration: 4000 });
    setLoading(false);
    onClose();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-espresso">Borrador de promoción</h3>
        <button onClick={onClose} className="text-warm-gray hover:text-espresso"><X size={18} /></button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-warm-gray uppercase">Nombre</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-warm-gray uppercase">Día</label>
          <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1">
            {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-warm-gray uppercase">Tipo de beneficio</label>
          <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1">
            <option value="percentage">Descuento %</option>
            <option value="2x1">2x1</option>
            <option value="gift">Regalo con compra</option>
            <option value="other">Otro</option>
          </select>
        </div>
        {form.discountType === 'percentage' && (
          <div>
            <label className="text-xs font-semibold text-warm-gray uppercase">Valor (%)</label>
            <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1" />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-warm-gray uppercase">Texto para WhatsApp</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1 resize-none" />
        </div>
      </div>
      <p className="text-xs text-warm-gray mt-3">⚠️ Esto NO se publica automáticamente. Se guarda como borrador para que lo revises y actives cuando quieras.</p>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-warm-gray hover:bg-gray-50">Cancelar</button>
        <button onClick={handleSave} disabled={loading || !form.name.trim()} className="flex-1 px-4 py-2.5 rounded-lg bg-[#8B6F4E] text-white text-sm font-semibold hover:bg-[#7A5F3E] disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          Guardar borrador
        </button>
      </div>
    </>
  );
}

// ==================== VARIANT D: Production List ====================
function ProductionListVariant({ data, onClose, onActionComplete }: any) {
  const now = new Date();
  const targetDay = data?.peakDay ?? now.getDay();
  const items = generateProductionList(data?.orders || [], data?.products || [], targetDay, now);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    items.forEach(i => { map[i.product] = i.quantity; });
    return map;
  });
  const [notes, setNotes] = useState('');

  const totalUnits = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalRevenue = items.reduce((s, i) => s + (quantities[i.product] || 0) * i.price, 0);

  const generateText = () => {
    const lines = items.map(i => `• ${i.product}: ${quantities[i.product] || 0} unidades`).join('\n');
    return `📋 Lista de producción — ${DAY_NAMES[targetDay]}\n${lines}\nTotal: ${totalUnits} unidades\nIngreso estimado: ${formatPrice(totalRevenue)}${notes ? `\nNotas: ${notes}` : ''}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    onActionComplete?.({
      action_type: 'production_list_copied',
      description: `Lista de producción para ${DAY_NAMES[targetDay].toLowerCase()} copiada (${totalUnits} unidades estimadas)`,
      metadata: { day: DAY_NAMES[targetDay], totalUnits, totalRevenue },
    });
    toast.success('Lista copiada al portapapeles ✓', { duration: 4000 });
    onClose();
  };

  const handleDownload = () => {
    const blob = new Blob([generateText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `produccion_${DAY_NAMES[targetDay].toLowerCase()}.txt`; a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-espresso">Lista de producción sugerida — {DAY_NAMES[targetDay]}</h3>
        <button onClick={onClose} className="text-warm-gray hover:text-espresso"><X size={18} /></button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-warm-gray uppercase border-b">
              <th className="text-left py-2">Producto</th>
              <th className="text-center py-2">Cantidad</th>
              <th className="text-left py-2">Categoría</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.product} className="border-b border-gray-50">
                <td className="py-2 text-espresso">{i.product}</td>
                <td className="py-2 text-center">
                  <input type="number" min={0} value={quantities[i.product] || 0} onChange={e => setQuantities(q => ({ ...q, [i.product]: parseInt(e.target.value) || 0 }))} className="w-16 text-center rounded border border-gray-200 py-1 text-sm" />
                </td>
                <td className="py-2 text-warm-gray">{i.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-sm text-espresso">
        <p>Total estimado: <strong>{totalUnits} unidades</strong></p>
        <p>Ingreso estimado: <strong>{formatPrice(totalRevenue)}</strong></p>
      </div>
      <div className="mt-3">
        <label className="text-xs font-semibold text-warm-gray uppercase">Notas adicionales</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1" placeholder="Ej: preparar extra de brownie" />
      </div>
      <p className="text-xs text-warm-gray mt-3">ℹ️ Esta es una estimación basada en pedidos anteriores. Ajustá las cantidades según tu criterio.</p>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-warm-gray hover:bg-gray-50">Descartar</button>
        <button onClick={handleDownload} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-warm-gray hover:bg-gray-50 flex items-center gap-1.5">
          <Download size={14} /> Descargar
        </button>
        <button onClick={handleCopy} className="flex-1 px-4 py-2.5 rounded-lg bg-[#8B6F4E] text-white text-sm font-semibold hover:bg-[#7A5F3E] flex items-center justify-center gap-1.5">
          <Copy size={14} /> Copiar al portapapeles
        </button>
      </div>
    </>
  );
}

// ==================== CANCEL ORDER ====================
function CancelOrderVariant({ data, onClose, onActionComplete, loading, setLoading }: any) {
  const handleCancel = async () => {
    setLoading(true);
    await supabase.from('orders').update({ status: 'cancelled' } as any).eq('id', data.orderId);
    onActionComplete?.({
      action_type: 'order_cancelled',
      description: `Pedido de ${data.name} cancelado desde el asistente`,
      related_entity_type: 'order',
      related_entity_id: data.orderId,
    });
    toast.success('Pedido cancelado ✓', { duration: 4000 });
    setLoading(false);
    onClose();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-espresso">¿Cancelar pedido?</h3>
        <button onClick={onClose} className="text-warm-gray hover:text-espresso"><X size={18} /></button>
      </div>
      <p className="text-sm text-warm-gray">¿Estás seguro de cancelar el pedido de <strong>{data?.name}</strong>? Esta acción no se puede deshacer.</p>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-warm-gray hover:bg-gray-50">No, volver</button>
        <button onClick={handleCancel} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          Sí, cancelar
        </button>
      </div>
    </>
  );
}
