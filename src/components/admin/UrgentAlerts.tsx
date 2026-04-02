import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { UrgentAlert } from '@/lib/insightEngine';
import ActionConfirmModal from './ActionConfirmModal';

interface Props {
  alerts: UrgentAlert[];
  onRefresh: () => void;
  onLogAction: (entry: any) => void;
}

export default function UrgentAlertsLayer({ alerts, onRefresh, onLogAction }: Props) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [modal, setModal] = useState<{ variant: any; data: any } | null>(null);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const displayed = showAll ? visible : visible.slice(0, 5);
  const remaining = visible.length - 5;

  const handleAction = async (action: any) => {
    if (action.type === 'confirm_order') {
      await supabase.from('orders').update({ status: 'confirmed' } as any).eq('id', action.data.orderId);
      toast.success('Pedido confirmado ✓', { duration: 4000 });
      onLogAction({ action_type: 'order_confirmed', description: 'Pedido confirmado desde alertas urgentes', related_entity_type: 'order', related_entity_id: action.data.orderId });
      onRefresh();
    } else if (action.type === 'mark_picked_up') {
      await supabase.from('orders').update({ status: 'picked_up' } as any).eq('id', action.data.orderId);
      toast.success('Marcado como retirado ✓', { duration: 4000 });
      onLogAction({ action_type: 'order_confirmed', description: 'Pedido marcado como retirado desde alertas', related_entity_type: 'order', related_entity_id: action.data.orderId });
      onRefresh();
    } else if (action.type === 'cancel_order') {
      setModal({ variant: 'cancel_order', data: action.data });
    } else if (action.type === 'whatsapp') {
      setModal({ variant: 'whatsapp', data: action.data });
    } else if (action.type === 'navigate') {
      navigate(action.data.route);
    }
  };

  return (
    <>
      <div className={`bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 mb-4 ${visible.length === 1 ? '' : ''}`}>
        {visible.length > 1 && (
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-red-800">🚨 Acciones Urgentes</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-200 text-red-800 font-bold">{visible.length}</span>
          </div>
        )}
        <div className="space-y-2">
          {displayed.map(alert => (
            <div key={alert.id} className="flex items-start gap-2">
              <span className="text-sm flex-shrink-0 mt-0.5">{alert.icon}</span>
              <p className="text-sm text-red-900 flex-1">{alert.text}</p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {alert.actions.map((action, i) => (
                  <button key={i} onClick={() => handleAction(action)}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap"
                    aria-label={action.label}>
                    {action.label}
                  </button>
                ))}
                <button onClick={() => setDismissed(s => new Set(s).add(alert.id))} className="text-red-300 hover:text-red-500 ml-1" aria-label="Descartar alerta">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {!showAll && remaining > 0 && (
          <button onClick={() => setShowAll(true)} className="text-xs text-red-600 font-semibold mt-2 hover:underline">
            y {remaining} más... ▼
          </button>
        )}
      </div>

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
