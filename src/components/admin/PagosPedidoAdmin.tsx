import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreditCard, CheckCircle2, PackageCheck, AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatPrice';
import { useOrderPaymentCalculations } from '@/hooks/useOrderPaymentCalculations';

type MessageKind = 'solicitar_sena' | 'confirmar_sena' | 'pedido_listo';

interface Props {
  order: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function formatDateSpanish(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatOrderDetails(items: any[] = []): string {
  return items
    .map((it: any) => {
      const label = it.variantLabel ? `${it.productName} – ${it.variantLabel}` : it.productName;
      const lineTotal = Number(it.unitPrice) * Number(it.quantity);
      return `${label} x${it.quantity} = ${formatPrice(lineTotal)}`;
    })
    .join('\n');
}

export default function PagosPedidoAdmin({ order, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MessageKind | null>(null);
  const [draftText, setDraftText] = useState('');
  const [depositInput, setDepositInput] = useState<string>(
    order?.deposit_amount != null ? String(order.deposit_amount) : ''
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDepositInput(order?.deposit_amount != null ? String(order.deposit_amount) : '');
  }, [order?.id, order?.deposit_amount]);

  const { data: settings } = useQuery({
    queryKey: ['site-settings-payment-config'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('key, value');
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = r.value || ''; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const cfg = useMemo(() => {
    const s = settings || {};
    return {
      alias: s.pago_alias || s.alias || '',
      cbu: s.cbu_pago || '',
      pickupAddress: s.direccion_retiro || s.pickup_address || s.address || '',
      hours: s.horarios || s.business_hours || '',
      minPct: Number(s.min_deposit_percentage || 30),
      maxPct: Number(s.max_deposit_percentage || 70),
    };
  }, [settings]);

  const calc = useOrderPaymentCalculations({
    total_price: Number(order?.total ?? 0),
    deposit_amount: order?.deposit_amount,
    deposit_percentage: order?.deposit_percentage,
    is_deposit_confirmed: order?.is_deposit_confirmed,
    status: order?.status,
    min_deposit_percentage: cfg.minPct,
    max_deposit_percentage: cfg.maxPct,
  });

  const configMissing = !cfg.alias || !cfg.pickupAddress;

  const buildMessage = (kind: MessageKind): string => {
    const customer = order.customer_name || 'cliente';
    const total = Number(order.total) || 0;
    const orderDetails = formatOrderDetails(order.items || []);
    const pickupDate = formatDateSpanish(order.desired_date);
    const pickupTime = order.preferred_time || '';
    const depositSuggested = order.deposit_amount ? Number(order.deposit_amount) : Math.round(total * 0.5);

    if (kind === 'solicitar_sena') {
      return `¡Hola ${customer}!\n\nPara confirmar tu pedido, te pedimos una seña del 50% del total.\n\n💰 Seña a abonar: ${formatPrice(depositSuggested)}\n💰 Saldo pendiente: ${formatPrice(total - depositSuggested)}\n💰 Total del pedido: ${formatPrice(total)}\n\n📋 Tu pedido:\n${orderDetails}\n\n💳 Podés abonar por transferencia a:\nAlias: ${cfg.alias}${cfg.cbu ? `\nCBU: ${cfg.cbu}` : ''}\n\nCuando confirmes el pago, nos avisás y aseguramos tu pedido. El saldo restante lo abonás el día del retiro.\n\n🕐 Horarios: ${cfg.hours}\n\n¿Preguntas? Escribinos 📱`;
    }
    if (kind === 'confirmar_sena') {
      return `¡Hola ${customer}!\n\nConfirmamos que recibimos tu seña de ${formatPrice(calc.amountPaid)} ✅\n\n📋 Tu pedido:\n${orderDetails}\n\n💰 Saldo a abonar el día del retiro: ${formatPrice(calc.remainingBalance)}\n\n📅 Retiro confirmado para: ${pickupDate} - ${pickupTime}\n📍 Dirección: ${cfg.pickupAddress}\n\nEl día de la entrega, abonás el saldo y te llevás tu pedido. ¡Listo!\n\n📱 Si necesitás cambiar la fecha, avisanos con tiempo.`;
    }
    // pedido_listo
    return `¡Hola ${customer}!\n\nTu pedido está listo para retirar 🎉\n\n📋 Pedido: #${String(order.id).slice(0, 8).toUpperCase()}\n📅 Fecha: ${pickupDate}\n🕐 Horario: ${pickupTime}\n📍 Dirección: ${cfg.pickupAddress}\n\n💰 Total: ${formatPrice(total)}\n(Seña pagada: ${formatPrice(calc.amountPaid)} | Saldo a abonar: ${formatPrice(calc.remainingBalance)})\n\nGracias por confiar en Le Sucrée. Esperamos verte pronto 💚`;
  };

  const openDraft = (kind: MessageKind) => {
    if (configMissing) {
      toast.error('Configurá los datos de pago en Admin > Configuración');
      return;
    }
    setDraftText(buildMessage(kind));
    setEditing(kind);
  };

  const saveDraft = async () => {
    if (!editing) return;
    if (!draftText.trim()) {
      toast.error('El mensaje no puede estar vacío');
      return;
    }
    setSaving(true);
    const insertPayload: any = {
      name: order.customer_name || 'Cliente',
      email: order.customer_email || '',
      message: draftText,
      order_id: order.id,
      is_auto: true,
      sent: false,
      message_type: editing,
    };
    const { error } = await supabase.from('contact_messages').insert(insertPayload);
    if (error) {
      setSaving(false);
      toast.error('No se pudo guardar el borrador');
      return;
    }

    if (editing === 'confirmar_sena') {
      const { error: upErr } = await supabase
        .from('orders')
        .update({ is_deposit_confirmed: true, last_payment_date: new Date().toISOString() } as any)
        .eq('id', order.id);
      if (upErr) console.error(upErr);
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['pending-payments'] });
    }

    setSaving(false);
    toast.success('Mensaje generado. Revísalo antes de enviar.');
    setEditing(null);
  };

  const saveDepositAmount = async () => {
    const amount = Number(depositInput);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Monto inválido');
      return;
    }
    const total = Number(order.total) || 0;
    if (amount > total) {
      toast.error('La seña no puede superar el total');
      return;
    }
    const pct = total > 0 ? (amount / total) * 100 : 0;
    const depositPct = pct > 0 ? Math.round(pct) : Number(order.deposit_percentage) || 50;
    const { error } = await supabase
      .from('orders')
      .update({ deposit_amount: amount, deposit_percentage: depositPct, last_payment_date: new Date().toISOString() } as any)
      .eq('id', order.id);
    if (error) {
      toast.error('No se pudo actualizar la seña');
      return;
    }
    toast.success('Seña actualizada');
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    qc.invalidateQueries({ queryKey: ['pending-payments'] });
  };

  if (!open) return null;

  const statusBadge =
    calc.paymentStatus === 'complete'
      ? { label: 'Pagado', cls: 'bg-emerald-100 text-emerald-800' }
      : calc.paymentStatus === 'partial'
      ? { label: 'Parcial', cls: 'bg-amber-100 text-amber-800' }
      : { label: 'Pendiente', cls: 'bg-red-100 text-red-700' };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#F0E8E0]">
          <h3 className="font-display text-lg font-bold text-espresso">
            💰 Pagos del pedido #{String(order.id).slice(0, 8).toUpperCase()}
          </h3>
          <button onClick={() => onOpenChange(false)} className="p-1 text-warm-gray hover:text-espresso">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {configMissing && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>Configurá alias de pago y dirección de retiro en Admin &gt; Configuración para generar mensajes.</span>
            </div>
          )}

          {/* Payment status card */}
          <div className="rounded-xl border border-[#E8DDD4] bg-[#FFFBF5] p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-warm-gray uppercase tracking-wider">Total del pedido</span>
                <p className="font-bold text-espresso">{formatPrice(Number(order.total) || 0)}</p>
              </div>
              <div>
                <span className="text-xs text-warm-gray uppercase tracking-wider">Seña abonada</span>
                <p className="font-bold text-espresso">{formatPrice(calc.amountPaid)}</p>
              </div>
              <div>
                <span className="text-xs text-warm-gray uppercase tracking-wider">Saldo pendiente</span>
                <p className={`font-bold ${calc.remainingBalance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {formatPrice(calc.remainingBalance)}
                </p>
              </div>
              <div>
                <span className="text-xs text-warm-gray uppercase tracking-wider">Estado</span>
                <p>
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold ${statusBadge.cls}`}>
                    {statusBadge.label}
                  </span>
                  {calc.isDepositConfirmed && order.last_payment_date && (
                    <span className="ml-2 text-xs text-emerald-700">✅ {formatDateSpanish(order.last_payment_date)}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-warm-gray mb-1">
                <span>Progreso de pago</span>
                <span className="font-semibold">{Math.round(calc.paymentProgress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#F0E8E0] overflow-hidden">
                <div
                  className={`h-full transition-all ${calc.paymentStatus === 'complete' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${calc.paymentProgress}%` }}
                />
              </div>
            </div>

            {/* Inline deposit amount editor */}
            <div className="mt-4 flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Registrar seña ($)</label>
                <input
                  type="number"
                  min={0}
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  className="w-full rounded-lg border border-[#E8DDD4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
                />
              </div>
              <button
                onClick={saveDepositAmount}
                className="rounded-lg bg-espresso text-white px-4 py-2 text-sm font-semibold hover:bg-espresso/90 transition-colors"
              >
                Guardar
              </button>
            </div>
            <p className="text-[11px] text-warm-gray mt-1">
              Rango sugerido: {cfg.minPct}% – {cfg.maxPct}% del total
              ({formatPrice(Math.round((Number(order.total) || 0) * cfg.minPct / 100))} –
              {' '}{formatPrice(Math.round((Number(order.total) || 0) * cfg.maxPct / 100))})
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => openDraft('solicitar_sena')}
              disabled={configMissing}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#E8DDD4] bg-white px-3 py-2.5 text-sm text-espresso font-semibold hover:bg-[#FFFBF5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard size={15} /> Solicitar Seña
            </button>
            <button
              onClick={() => openDraft('confirmar_sena')}
              disabled={configMissing || calc.amountPaid <= 0}
              title={calc.amountPaid <= 0 ? 'Registrá la seña primero' : ''}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#E8DDD4] bg-white px-3 py-2.5 text-sm text-espresso font-semibold hover:bg-[#FFFBF5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={15} /> Confirmar Seña
            </button>
            <button
              onClick={() => openDraft('pedido_listo')}
              disabled={configMissing}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#E8DDD4] bg-white px-3 py-2.5 text-sm text-espresso font-semibold hover:bg-[#FFFBF5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PackageCheck size={15} /> Pedido Listo
            </button>
          </div>

          {/* Payment timeline */}
          <div className="rounded-xl border border-[#F0E8E0] p-4">
            <h4 className="text-xs font-semibold text-espresso uppercase tracking-wider mb-2">📅 Historial de pagos</h4>
            <ul className="space-y-1 text-sm text-warm-gray">
              {calc.amountPaid > 0 ? (
                <li>• Seña recibida: <span className="text-espresso font-semibold">{formatPrice(calc.amountPaid)}</span>
                  {order.last_payment_date && <> el {formatDateSpanish(order.last_payment_date)}</>}
                  {calc.isDepositConfirmed ? ' ✅ confirmada' : ' (sin confirmar)'}
                </li>
              ) : (
                <li>• Sin pagos registrados</li>
              )}
              {calc.remainingBalance > 0 && (
                <li>• Próximo pago: <span className="text-espresso font-semibold">{formatPrice(calc.remainingBalance)}</span> – vence el {formatDateSpanish(order.desired_date)}</li>
              )}
            </ul>
          </div>
        </div>

        {/* Draft preview modal */}
        {editing && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
              <div className="flex items-center justify-between p-4 border-b border-[#F0E8E0]">
                <h4 className="font-display text-base font-bold text-espresso">Vista previa del mensaje</h4>
                <button onClick={() => setEditing(null)} className="p-1 text-warm-gray hover:text-espresso">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={14}
                  className="w-full rounded-lg border border-[#E8DDD4] bg-white px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded-lg border border-[#E8DDD4] bg-white px-4 py-2 text-sm text-warm-gray hover:bg-[#FFFBF5]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="rounded-lg bg-dusty-pink text-white px-4 py-2 text-sm font-semibold hover:bg-mauve disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar borrador'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
