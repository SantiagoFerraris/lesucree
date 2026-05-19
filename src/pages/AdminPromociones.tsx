import { useState } from 'react';
import { Tag } from 'lucide-react';
import OfertasProgramadas from '@/components/admin/OfertasProgramadas';

type TabKey = 'programadas' | 'zumbita';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'programadas', label: 'Ofertas Programadas' },
  { key: 'zumbita', label: 'Solicitudes Zumbita' },
];

export default function AdminPromociones() {
  const [activeTab, setActiveTab] = useState<TabKey>('programadas');

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="font-display text-2xl font-bold text-espresso flex items-center gap-3">
          <Tag size={22} className="text-dusty-pink" />
          Promociones
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
              activeTab === t.key
                ? 'bg-espresso text-white'
                : 'bg-cream text-warm-gray hover:bg-blush'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'programadas' && <OfertasProgramadas />}

      {activeTab === 'zumbita' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-cream flex items-center justify-center">
              <Tag size={24} className="text-dusty-pink" />
            </div>
            <h3 className="font-display text-lg font-bold text-espresso mb-2">
              Solicitudes Zumbita
            </h3>
            <p className="text-sm text-warm-gray">
              Acá vas a poder revisar y responder las solicitudes recibidas desde Zumbita. Próximamente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

