import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { DailySummaryData } from '@/lib/insightEngine';

interface Props {
  summary: DailySummaryData | null;
  onRefresh: () => void;
  loading: boolean;
}

export default function DailySummaryLayer({ summary, onRefresh, loading }: Props) {
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 500);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-espresso">📋 Resumen del Día</h3>
        <button onClick={handleRefresh} className="p-1.5 rounded-lg text-warm-gray hover:text-espresso hover:bg-cream/50 transition-colors" aria-label="Actualizar resumen">
          <RefreshCw size={14} className={spinning || loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {summary ? (
        <>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">{summary.paragraph}</p>
          <p className="text-xs text-gray-400 mt-2">
            Última actualización: {summary.updatedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </>
      ) : (
        <div className="h-16 bg-gray-100 animate-pulse rounded mt-3" />
      )}
    </div>
  );
}
