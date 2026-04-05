import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildWhatsAppUrl } from '@/lib/insightEngine';
import { formatPrice } from '@/lib/formatPrice';
import type { UrgentAlert } from '@/lib/insightEngine';
import ActionConfirmModal from './ActionConfirmModal';

interface Props {
  alerts: UrgentAlert[];
  onRefresh: () => void;
  onLogAction: (entry: any) => void;
}

function getAlertStyle(alert: UrgentAlert): { borderClass: string; label: string } {
  if (alert.type === 'overdue') {
    const daysMatch = alert.text.match(/hace (\d+)/);
    const days = daysMatch ? parseInt(daysMatch[1]) : 1;
    return { borderClass: 'border-l-4 border-red-500', label: `Vencido hace ${days} día${days !== 1 ? 's' : ''}` };
  }
  if (alert.type === 'today_pending') {
    return { borderClass: 'border-l-4 border-orange-400', label: 'Vence hoy' };
  }
  if (alert.type === 'payment_pending') {
    return { borderClass: 'border-l-4 border-yellow-400', label: 'Pago pendiente' };
  }
  if (alert.type === 'unread_messages') {
    return { borderClass: 'border-l-4 border-yellow-400', label: 'Pendiente de confirmar' };
  }
  return { borderClass: 'border-l-4 border-gray-300', label: '' };
}

function buildContextualWhatsAppMessage(alert: UrgentAlert): string {
  const order = alert.order;
  if (!order) return '';
  const name = order.customer_name || '';
  const items = order.items as any[];
  const product = items?.[0]?.productName || 'tu pedido';
  const total = order.total ? formatPrice(order.total) : '';

  if (alert.type === 'overdue') {
    return `Hola ${name}! Te escribo de Le Sucrée. Tu pedido de ${product} está listo para retirar en Catamarca 1473, 1° B. ¿Podés pasar hoy? 🧁`;
  }
  if (alert.type === 'payment_pending') {
    return `Hola ${name}! Te escribo de Le Sucrée. Queríamos confirmar tu pedido de ${product}. ¿Seguís con ganas? El total es ${total}. 😊`;
  }
  if (alert.type === 'today_pending') {
    return `Hola ${name}! Te escribo de Le Sucrée. Recibimos tu pedido de ${product}. Te lo confirmamos lo antes posible. 😊`;
  }
  return `Hola ${name}! Te escribo de Le Sucrée. 😊`;
}

function getProductSummary(items: any): string {
  if (!items || !Array.isArray(items) || items.length === 0) return '—';
  const first = items[0]?.productName || '—';
  if (items.length === 1) return first;
  return `${first} + ${items.length - 1} más`;
}

interface CancelConfirmProps {
  open: boolean;
  order: any;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function CancelConfirmDialog({ open, order, onClose, onConfirm, loading }: CancelConfirmProps) {
  if (!open || !order) return null;
  const product = getProductSummary(order.items);
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md md:rounded-xl rounded-t-xl shadow-2xl p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-espresso text-base mb-3">¿Estás segura de cancelar este pedido?</h3>
        <p className="text-sm text-warm-gray leading-relaxed mb-5">
          Vas a cancelar el pedido de <strong className="text-espresso">{order.customer_name}</strong> por{' '}
          <strong className="text-espresso">{product}</strong> ({formatPrice(order.total)}).
          <br />
          <span className="text-red-500 text-xs mt-1 inline-block">Esta acción no se puede deshacer.</span>
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-espresso text-white text-sm font-semibold hover:bg-espresso/90 transition-colors">
            No, volver
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Sí, cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UrgentAlertsLayer({ alerts, onRefresh, onLogAction }: Props) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [modal, setModal] = useState<{ variant: any; data: any } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const displayed = showAll ? visible : visible.slice(0, 5);
  const remaining = visible.length - 5;

  const handleConfirmOrder = async (orderId: string) => {
    await supabase.from('orders').update({ status: 'confirmed' } as any).eq('id', orderId);
    toast.success('Pedido confirmado ✓', { duration: 4000 });
    onLogAction({ action_type: 'order_confirmed', description: 'Pedido confirmado desde alertas urgentes', related_entity_type: 'order', related_entity_id: orderId });
    onRefresh();
  };

  const handleMarkPickedUp = async (orderId: string) => {
    await supabase.from('orders').update({ status: 'picked_up' } as any).eq('id', orderId);
    toast.success('Marcado como retirado ✓', { duration: 4000 });
    onLogAction({ action_type: 'order_picked_up', description: 'Pedido marcado como retirado desde alertas', related_entity_type: 'order', related_entity_id: orderId });
    onRefresh();
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    await supabase.from('orders').update({ status: 'cancelled' } as any).eq('id', cancelTarget.id);
    toast.success('Pedido cancelado', { duration: 4000 });
    onLogAction({ action_type: 'order_cancelled', description: `Pedido de ${cancelTarget.customer_name} cancelado desde alertas`, related_entity_type: 'order', related_entity_id: cancelTarget.id });
    setCancelLoading(false);
    setCancelTarget(null);
    onRefresh();
  };

  const handleWhatsApp = (alert: UrgentAlert) => {
    const phone = alert.order?.customer_phone;
    if (!phone) return;
    const message = buildContextualWhatsAppMessage(alert);
    const url = buildWhatsAppUrl(phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
    onLogAction({
      action_type: 'whatsapp_sent',
      description: `WhatsApp enviado a ${alert.order?.customer_name} desde alertas urgentes`,
      related_entity_type: 'order',
      related_entity_id: alert.order?.id,
    });
  };

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-espresso">🚨 Acciones Urgentes</h3>
          {visible.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">{visible.length}</span>
          )}
        </div>

        <div className="space-y-2">
          {displayed.map(alert => {
            const { borderClass, label } = getAlertStyle(alert);
            const isMessageAlert = alert.type === 'unread_messages';

            return (
              <div key={alert.id} className={`rounded-lg p-3 bg-white border border-gray-100 ${borderClass}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Urgency label */}
                    {label && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-1.5 inline-block ${
                        alert.type === 'overdue' ? 'bg-red-100 text-red-700' :
                        alert.type === 'today_pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {label}
                      </span>
                    )}
                    <p className="text-xs text-espresso leading-relaxed">{alert.text}</p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      {/* For message alerts: just navigate */}
                      {isMessageAlert ? (
                        <button
                          onClick={() => handleNavigate(alert.actions.find(a => a.type === 'navigate')?.data?.route || '/admin/mensajes')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-espresso text-white text-xs font-semibold hover:bg-espresso/90 transition-colors"
                        >
                          Ver mensajes
                        </button>
                      ) : (
                        <>
                          {/* Primary: WhatsApp contact */}
                          <button
                            onClick={() => handleWhatsApp(alert)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-semibold hover:bg-[#20BD5A] transition-colors"
                          >
                            <MessageCircle size={12} />
                            Contactar
                          </button>

                          {/* Secondary: context-specific action */}
                          {alert.type === 'overdue' && (
                            <button
                              onClick={() => handleMarkPickedUp(alert.order?.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-espresso/30 text-espresso text-xs font-semibold hover:bg-cream transition-colors"
                            >
                              <CheckCircle size={12} />
                              Marcar retirado
                            </button>
                          )}
                          {alert.type === 'today_pending' && (
                            <button
                              onClick={() => handleConfirmOrder(alert.order?.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-espresso/30 text-espresso text-xs font-semibold hover:bg-cream transition-colors"
                            >
                              <CheckCircle size={12} />
                              Confirmar pedido
                            </button>
                          )}

                          {/* Tertiary: Cancel (text-only, requires confirmation) */}
                          {(alert.type === 'overdue' || alert.type === 'today_pending') && alert.order && (
                            <button
                              onClick={() => setCancelTarget(alert.order)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors ml-1"
                            >
                              Cancelar pedido
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <button onClick={() => setDismissed(s => new Set(s).add(alert.id))} className="text-warm-gray/40 hover:text-warm-gray flex-shrink-0 mt-0.5" aria-label="Descartar alerta">
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!showAll && remaining > 0 && (
          <button onClick={() => setShowAll(true)} className="text-xs text-espresso font-semibold mt-3 hover:underline">
            Ver {remaining} alerta{remaining > 1 ? 's' : ''} más →
          </button>
        )}
      </div>

      {/* Cancel confirmation dialog */}
      <CancelConfirmDialog
        open={!!cancelTarget}
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        loading={cancelLoading}
      />

      {modal && (
        <ActionConfirmModal
          open={true}
          onClose={() => { setModal(null); onRefresh(); }}
          variant={modal.variant}
          data={modal.data}
          onActionComplete={(entry) => { onLogAction(entry); onRefresh(); }}
        />
      )}
    </>
  );
}
