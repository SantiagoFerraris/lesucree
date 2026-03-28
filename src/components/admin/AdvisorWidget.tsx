import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, RefreshCw, X, Eye, AlertTriangle, Lightbulb, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { useBusinessAdvisor } from '@/hooks/useBusinessAdvisor';

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'border-l-4 border-red-400 bg-red-50/50',
  high: 'border-l-4 border-amber-400 bg-amber-50/50',
  medium: 'border-l-4 border-blue-200 bg-blue-50/30',
  low: 'border-l-4 border-gray-200 bg-white',
};

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  alert: AlertCircle,
  warning: AlertTriangle,
  suggestion: Lightbulb,
  trend: TrendingUp,
  opportunity: Sparkles,
};

export default function AdvisorWidget() {
  const navigate = useNavigate();
  const { insights, isLoading, running, runAnalysis, dismissInsight, markAsRead } = useBusinessAdvisor();
  const [expanded, setExpanded] = useState(true);

  const unreadCount = insights.filter(i => !i.is_read).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-cream flex items-center justify-center">
            <Brain size={18} className="text-espresso" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-espresso">🧠 Asistente Inteligente</h3>
            <p className="text-[11px] text-warm-gray">Análisis automático de tu negocio</p>
          </div>
          {unreadCount > 0 && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
              {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAnalysis}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream text-espresso text-xs font-semibold hover:bg-espresso hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={running ? 'animate-spin' : ''} />
            {running ? 'Analizando...' : 'Analizar'}
          </button>
          <button onClick={() => setExpanded(!expanded)} className="text-warm-gray hover:text-espresso transition-colors">
            {expanded ? <X size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-8">
              <Brain size={32} className="mx-auto text-warm-gray/40 mb-2" />
              <p className="text-sm text-warm-gray">No hay insights todavía.</p>
              <p className="text-xs text-warm-gray/70 mt-1">Hacé clic en "Analizar" para generar recomendaciones.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {insights.slice(0, 8).map(insight => {
                const Icon = TYPE_ICONS[insight.insight_type] || Lightbulb;
                return (
                  <div
                    key={insight.id}
                    className={`rounded-lg p-3 transition-all ${PRIORITY_STYLES[insight.priority] || 'bg-white'} ${!insight.is_read ? 'ring-1 ring-espresso/10' : 'opacity-80'}`}
                    onClick={() => { if (!insight.is_read) markAsRead(insight.id); }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Icon size={14} className="text-espresso mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-espresso leading-tight">{insight.title}</p>
                          <p className="text-[11px] text-warm-gray mt-1 leading-relaxed">{insight.description}</p>
                          {insight.action_label && insight.action_route && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(insight.action_route!); }}
                              className="mt-1.5 text-[11px] font-semibold text-espresso underline underline-offset-2 hover:text-espresso/70"
                            >
                              {insight.action_label} →
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); dismissInsight(insight.id); }}
                        className="text-warm-gray/50 hover:text-warm-gray shrink-0"
                        title="Descartar"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
