import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const TYPE_ICONS: Record<string, string> = {
  whatsapp_sent: '💬',
  product_highlighted: '⭐',
  product_deactivated: '🔕',
  promo_drafted: '📋',
  order_confirmed: '✅',
  order_cancelled: '❌',
  production_list_copied: '📋',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ActionHistoryModal({ open, onClose }: Props) {
  const { data: actions, isLoading } = useQuery({
    queryKey: ['assistant-action-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assistant_actions_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50) as any;
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' +
      date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const exportCSV = () => {
    if (!actions?.length) return;
    const headers = ['Fecha', 'Tipo', 'Descripción'];
    const rows = actions.map(a => [formatDate(a.created_at), a.action_type, a.description]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `historial_acciones_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-lg md:rounded-xl rounded-t-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-espresso">📜 Historial de acciones</h3>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 text-xs text-warm-gray hover:bg-gray-50">
              <Download size={12} /> Exportar CSV
            </button>
            <button onClick={onClose} className="text-warm-gray hover:text-espresso"><X size={18} /></button>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div>
        ) : !actions?.length ? (
          <p className="text-sm text-warm-gray text-center py-8">No hay acciones registradas todavía.</p>
        ) : (
          <div className="space-y-2">
            {actions.map(a => (
              <div key={a.id} className="flex items-start gap-2 text-sm py-2 border-b border-gray-50">
                <span className="text-xs text-warm-gray whitespace-nowrap mt-0.5">{formatDate(a.created_at)}</span>
                <span className="flex-shrink-0">{TYPE_ICONS[a.action_type] || '📝'}</span>
                <span className="text-espresso">{a.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
