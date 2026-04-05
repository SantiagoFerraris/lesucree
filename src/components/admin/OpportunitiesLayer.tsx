import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, RefreshCw, X, CalendarDays } from 'lucide-react';
import type { SmartInsight } from '@/lib/insightEngine';
import ActionConfirmModal from './ActionConfirmModal';

const PRIORITY_STYLES: Record<string, string> = {
  high: 'border-l-[3px] border-l-red-500',
  medium: 'border-l-[3px] border-l-amber-500',
  low: 'border-l-[3px] border-l-emerald-500',
};

const PRIORITY_LABELS: Record<string, { emoji: string; text: string }> = {
  high: { emoji: '🔴', text: 'Alta' },
  medium: { emoji: '🟡', text: 'Media' },
  low: { emoji: '🟢', text: 'Info' },
};

interface Props {
  insights: SmartInsight[];
  running: boolean;
  onAnalyze: () => void;
  onDismiss: (id: string) => void;
  onLogAction: (entry: any) => void;
  onRefresh: () => void;
}

export default function OpportunitiesLayer({ insights, running, onAnalyze, onDismiss, onLogAction, onRefresh }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [modal, setModal] = useState<{ variant: any; data: any } | null>(null);

  const visible = insights.filter(i => !i.dismissed);
  const displayed = showAll ? visible : visible.slice(0, 4);
  const remaining = visible.length - 4;

  const handleInsightAction = (insight: SmartInsight) => {
    if (insight.actionType === 'navigate') {
      navigate(insight.actionData?.route || '/admin/dashboard');
    } else {
      setModal({ variant: insight.actionType, data: insight.actionData });
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-espresso">💡 Oportunidades</h3>
            {visible.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cream text-warm-gray font-bold">{visible.length}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); onAnalyze(); }} disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream text-espresso text-xs font-semibold hover:bg-espresso hover:text-white transition-colors disabled:opacity-50"
              aria-label="Analizar negocio">
              <RefreshCw size={12} className={running ? 'animate-spin' : ''} />
              {running ? 'Analizando...' : 'Analizar'}
            </button>
            {expanded ? <ChevronUp size={16} className="text-warm-gray" /> : <ChevronDown size={16} className="text-warm-gray" />}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-2">
            {visible.length === 0 ? (
              <p className="text-sm text-warm-gray py-4 text-center">
                Todo en orden 👍 No hay oportunidades nuevas por ahora. Hacé click en "Analizar" para recalcular.
              </p>
            ) : (
              <>
                {displayed.map(insight => {
                  const priority = PRIORITY_LABELS[insight.priority];
                  return (
                    <div key={insight.id} className={`rounded-lg p-3 bg-white border border-gray-100 ${PRIORITY_STYLES[insight.priority]}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs" title={priority.text} aria-label={`Prioridad: ${priority.text}`}>{priority.emoji}</span>
                            <p className="text-xs font-semibold text-espresso leading-tight">{insight.title}</p>
                          </div>
                          <p className="text-[11px] text-warm-gray leading-relaxed">{insight.description}</p>
                          {insight.actionLabel && (
                            <button onClick={() => handleInsightAction(insight)}
                              className="mt-2 text-[11px] font-semibold text-espresso px-2.5 py-1 rounded-md border border-espresso/20 hover:bg-cream transition-colors">
                              {insight.actionLabel} →
                            </button>
                          )}
                        </div>
                        <button onClick={() => onDismiss(insight.id)} className="text-warm-gray/40 hover:text-warm-gray flex-shrink-0" title="Descartar" aria-label="Descartar insight">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!showAll && remaining > 0 && (
                  <button onClick={() => setShowAll(true)} className="text-xs text-espresso font-semibold hover:underline">
                    Ver {remaining} oportunidad{remaining > 1 ? 'es' : ''} más →
                  </button>
                )}
              </>
            )}
          </div>
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
