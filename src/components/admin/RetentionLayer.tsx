import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, UserCheck, AlertTriangle, Star, X } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/insightEngine';
import type { RetentionInsight } from '@/lib/insightEngine';
import { formatPrice } from '@/lib/formatPrice';

interface Props {
  insights: RetentionInsight[];
}

const TYPE_CONFIG: Record<string, { icon: string; borderClass: string; labelClass: string; label: string }> = {
  first_timer_followup: {
    icon: '📱',
    borderClass: 'border-l-4 border-blue-400',
    labelClass: 'bg-blue-100 text-blue-700',
    label: 'Seguimiento',
  },
  inactive_client: {
    icon: '⚠️',
    borderClass: 'border-l-4 border-red-400',
    labelClass: 'bg-red-100 text-red-700',
    label: 'Inactivo',
  },
  frequent_client: {
    icon: '⭐',
    borderClass: 'border-l-4 border-amber-400',
    labelClass: 'bg-amber-100 text-amber-700',
    label: 'Frecuente',
  },
};

export default function RetentionLayer({ insights }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const actionable = insights.filter(i => i.type !== 'frequent_client' && !dismissed.has(i.id));
  const frequentCount = insights.filter(i => i.type === 'frequent_client').length;
  const visible = showAll ? actionable : actionable.slice(0, 4);
  const remaining = actionable.length - 4;

  if (actionable.length === 0 && frequentCount === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-espresso">👥 Seguimiento de Clientes</h3>
          {actionable.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">{actionable.length}</span>
          )}
          {frequentCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">{frequentCount} frecuente{frequentCount > 1 ? 's' : ''}</span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} className="text-warm-gray" /> : <ChevronDown size={16} className="text-warm-gray" />}
      </div>

      {expanded && (
        <div className="mt-4 space-y-2">
          {actionable.length === 0 ? (
            <p className="text-sm text-warm-gray py-3 text-center">
              No hay seguimientos pendientes. ¡Todos tus clientes están activos! 🎉
            </p>
          ) : (
            <>
              {visible.map(insight => {
                const config = TYPE_CONFIG[insight.type];
                return (
                  <div key={insight.id} className={`rounded-lg p-3 bg-white border border-gray-100 ${config.borderClass}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-xs">{config.icon}</span>
                          <span className="font-semibold text-xs text-espresso">{insight.clientName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${config.labelClass}`}>{config.label}</span>
                        </div>

                        {insight.type === 'first_timer_followup' && (
                          <p className="text-[11px] text-warm-gray leading-relaxed">
                            Compró <strong className="text-espresso">{insight.product}</strong> hace {insight.daysSince} días. ¿Le mandás un mensaje por WhatsApp?
                          </p>
                        )}

                        {insight.type === 'inactive_client' && (
                          <p className="text-[11px] text-warm-gray leading-relaxed">
                            No volvió a comprar hace {insight.daysSince} días. Sugerencia: ofrecé un 10% en su próximo pedido.
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <a
                            href={buildWhatsAppUrl(insight.clientPhone, insight.whatsappMessage)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-semibold hover:bg-[#20BD5A] transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            <MessageCircle size={12} />
                            Enviar WhatsApp
                          </a>
                          <span className="text-[10px] text-warm-gray">
                            {formatPrice(insight.totalSpent)} gastado
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setDismissed(prev => new Set(prev).add(insight.id))}
                        className="text-warm-gray/40 hover:text-warm-gray flex-shrink-0"
                        title="Descartar"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {!showAll && remaining > 0 && (
                <button onClick={() => setShowAll(true)} className="text-xs text-espresso font-semibold hover:underline">
                  Ver {remaining} seguimiento{remaining > 1 ? 's' : ''} más →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
