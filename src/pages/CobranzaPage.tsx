import { useMemo } from 'react';
import { CheckCircle2, DollarSign, AlertCircle, TrendingUp, Package } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  useEstadisticasCobranza,
  usePedidosConDeuda,
  usePagosDelMes,
  type PedidoConDeuda,
} from '@/hooks/usePagos';
import { formatPrice } from '@/lib/formatPrice';

const COLORS = {
  espresso: '#3B2617',
  dustyPink: '#B8836C',
  blush: '#F5E6DE',
  cream: '#FBF7F2',
  border: '#E8DDD4',
  green: '#5C9A6F',
  yellow: '#D4A24A',
  red: '#C25450',
  blue: '#4A7BA8',
};

type KpiVariant = 'blue' | 'red' | 'green' | 'pink';

function KpiCard({
  variant, icon: Icon, label, value, sub,
}: {
  variant: KpiVariant;
  icon: typeof DollarSign;
  label: string;
  value: string;
  sub?: string;
}) {
  const bg = {
    blue: 'rgba(74,123,168,0.08)',
    red: 'rgba(194,84,80,0.08)',
    green: 'rgba(92,154,111,0.08)',
    pink: 'rgba(184,131,108,0.10)',
  }[variant];
  const accent = {
    blue: COLORS.blue,
    red: COLORS.red,
    green: COLORS.green,
    pink: COLORS.dustyPink,
  }[variant];
  return (
    <div
      className="rounded-2xl p-5 border transition-shadow hover:shadow-md"
      style={{ background: bg, borderColor: COLORS.border }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: COLORS.espresso, opacity: 0.7, fontFamily: 'Lato, sans-serif' }}>
          {label}
        </span>
        <span className="p-2 rounded-full" style={{ background: accent + '22' }}>
          <Icon size={18} style={{ color: accent }} />
        </span>
      </div>
      <div className="text-2xl md:text-3xl font-bold" style={{ color: accent, fontFamily: 'Playfair Display, serif' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: COLORS.espresso, opacity: 0.6, fontFamily: 'Lato, sans-serif' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function PorcentajeBadge({ value }: { value: number }) {
  const color = value >= 100 ? COLORS.green : value > 0 ? COLORS.yellow : COLORS.red;
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: color + '20', color, fontFamily: 'Lato, sans-serif' }}
    >
      {Math.min(100, Math.round(value))}%
    </span>
  );
}

function EstadoBadge({ estado }: { estado: PedidoConDeuda['estado_deuda'] }) {
  const map = {
    pagado: { label: 'Pagado', color: COLORS.green },
    parcial: { label: 'Parcial', color: COLORS.yellow },
    sin_pagar: { label: 'Sin pagar', color: COLORS.red },
  } as const;
  const { label, color } = map[estado] ?? map.sin_pagar;
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: color + '20', color, fontFamily: 'Lato, sans-serif' }}
    >
      {label}
    </span>
  );
}

export default function CobranzaPage() {
  const { stats, isLoading: statsLoading } = useEstadisticasCobranza();
  const { pedidos, isLoading: pedidosLoading } = usePedidosConDeuda();
  const { pagosDelMes, totalRecaudadoMes, isLoading: pagosLoading } = usePagosDelMes();

  const isLoading = statsLoading || pedidosLoading || pagosLoading;

  const pieData = useMemo(() => ([
    { name: 'Pagados', value: stats?.pedidos_pagos ?? 0, color: COLORS.green },
    { name: 'Parciales', value: stats?.pedidos_parciales ?? 0, color: COLORS.yellow },
    { name: 'Sin pagar', value: stats?.pedidos_sin_pagar ?? 0, color: COLORS.red },
  ]), [stats]);

  const lineData = useMemo(() => {
    const days: { fecha: string; label: string; monto: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({
        fecha: iso,
        label: d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
        monto: 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.fecha, i]));
    for (const p of pagosDelMes) {
      const i = idx.get(p.fecha_pago);
      if (i !== undefined) days[i].monto += Number(p.monto ?? 0);
    }
    return days;
  }, [pagosDelMes]);

  const topDeudores = useMemo(
    () => [...pedidos].sort((a, b) => Number(b.deuda_restante) - Number(a.deuda_restante)).slice(0, 10),
    [pedidos]
  );

  const totalDeudores = pedidos.length;
  const todoPago = !isLoading && !!stats && stats.total_pedidos > 0 && totalDeudores === 0;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: COLORS.cream }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: COLORS.espresso, fontFamily: 'Playfair Display, serif' }}>
            💰 Reporte de Cobranza
          </h1>
          <p className="mt-1 text-sm md:text-base" style={{ color: COLORS.espresso, opacity: 0.7, fontFamily: 'Lato, sans-serif' }}>
            Estado financiero de todos los pedidos
          </p>
        </header>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            variant="blue"
            icon={DollarSign}
            label="Total recaudado"
            value={formatPrice(Number(stats?.total_recaudado ?? 0))}
            sub={`Este mes: ${formatPrice(totalRecaudadoMes)}`}
          />
          <KpiCard
            variant="red"
            icon={AlertCircle}
            label="Pendiente de cobrar"
            value={formatPrice(Number(stats?.total_pendiente ?? 0))}
            sub={`${totalDeudores} pedido${totalDeudores === 1 ? '' : 's'} con deuda`}
          />
          <KpiCard
            variant="green"
            icon={TrendingUp}
            label="Tasa de cobranza"
            value={`${Number(stats?.tasa_cobranza ?? 0).toFixed(1)}%`}
            sub="Recaudado / facturado"
          />
          <KpiCard
            variant="pink"
            icon={Package}
            label="Total pedidos"
            value={String(stats?.total_pedidos ?? 0)}
            sub={`${stats?.pedidos_pagos ?? 0} pagos · ${stats?.pedidos_parciales ?? 0} parciales · ${stats?.pedidos_sin_pagar ?? 0} sin pagar`}
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: COLORS.border }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: COLORS.espresso, fontFamily: 'Playfair Display, serif' }}>
              Distribución por estado
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: COLORS.border }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: COLORS.espresso, fontFamily: 'Playfair Display, serif' }}>
              Pagos últimos 7 días
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLORS.espresso }} />
                  <YAxis tick={{ fontSize: 12, fill: COLORS.espresso }} tickFormatter={(v) => formatPrice(Number(v))} width={80} />
                  <Tooltip formatter={(v: number) => formatPrice(Number(v))} />
                  <Line type="monotone" dataKey="monto" stroke={COLORS.dustyPink} strokeWidth={3} dot={{ r: 4, fill: COLORS.dustyPink }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Empty state */}
        {todoPago && (
          <div className="rounded-2xl p-8 text-center bg-white border" style={{ borderColor: COLORS.border }}>
            <CheckCircle2 size={48} className="mx-auto mb-3" style={{ color: COLORS.green }} />
            <h3 className="text-xl font-semibold" style={{ color: COLORS.espresso, fontFamily: 'Playfair Display, serif' }}>
              ¡Todo cobrado!
            </h3>
            <p className="text-sm mt-1" style={{ color: COLORS.espresso, opacity: 0.7, fontFamily: 'Lato, sans-serif' }}>
              No hay deudas pendientes en este momento.
            </p>
          </div>
        )}

        {/* Top deudores */}
        {!todoPago && (
          <section className="rounded-2xl bg-white border overflow-hidden" style={{ borderColor: COLORS.border }}>
            <div className="p-5 border-b" style={{ borderColor: COLORS.border }}>
              <h2 className="text-lg font-semibold" style={{ color: COLORS.espresso, fontFamily: 'Playfair Display, serif' }}>
                Top deudores
              </h2>
              <p className="text-xs" style={{ color: COLORS.espresso, opacity: 0.6, fontFamily: 'Lato, sans-serif' }}>
                Los 10 pedidos con mayor deuda restante
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: 'Lato, sans-serif' }}>
                <thead style={{ background: COLORS.blush }}>
                  <tr style={{ color: COLORS.espresso }}>
                    <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                    <th className="text-right px-4 py-3 font-semibold">Total</th>
                    <th className="text-right px-4 py-3 font-semibold">Pagado</th>
                    <th className="text-right px-4 py-3 font-semibold">Deuda</th>
                    <th className="text-center px-4 py-3 font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center opacity-60">Cargando...</td></tr>
                  ) : topDeudores.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center opacity-60">Sin deudores.</td></tr>
                  ) : (
                    topDeudores.map((p) => (
                      <tr key={p.id} className="border-t" style={{ borderColor: COLORS.border, color: COLORS.espresso }}>
                        <td className="px-4 py-3">{p.customer_name}</td>
                        <td className="px-4 py-3 text-right">{formatPrice(Number(p.total))}</td>
                        <td className="px-4 py-3 text-right">{formatPrice(Number(p.total_pagado))}</td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: COLORS.red }}>
                          {formatPrice(Number(p.deuda_restante))}
                        </td>
                        <td className="px-4 py-3 text-center"><PorcentajeBadge value={Number(p.porcentaje_pagado)} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Detalle completo */}
        <section className="rounded-2xl bg-white border overflow-hidden" style={{ borderColor: COLORS.border }}>
          <div className="p-5 border-b" style={{ borderColor: COLORS.border }}>
            <h2 className="text-lg font-semibold" style={{ color: COLORS.espresso, fontFamily: 'Playfair Display, serif' }}>
              Detalle completo
            </h2>
            <p className="text-xs" style={{ color: COLORS.espresso, opacity: 0.6, fontFamily: 'Lato, sans-serif' }}>
              Todos los pedidos con deuda pendiente
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: 'Lato, sans-serif' }}>
              <thead style={{ background: COLORS.blush }}>
                <tr style={{ color: COLORS.espresso }}>
                  <th className="text-left px-4 py-3 font-semibold">Pedido</th>
                  <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Email</th>
                  <th className="text-right px-4 py-3 font-semibold">Total</th>
                  <th className="text-right px-4 py-3 font-semibold">Pagado</th>
                  <th className="text-right px-4 py-3 font-semibold">Deuda</th>
                  <th className="text-center px-4 py-3 font-semibold">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold hidden sm:table-cell">Pagos</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-center opacity-60">Cargando...</td></tr>
                ) : pedidos.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-center opacity-60">Sin pedidos con deuda.</td></tr>
                ) : (
                  pedidos.map((p) => (
                    <tr key={p.id} className="border-t" style={{ borderColor: COLORS.border, color: COLORS.espresso }}>
                      <td className="px-4 py-3 font-mono text-xs">#{p.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">{p.customer_name}</td>
                      <td className="px-4 py-3 hidden md:table-cell opacity-70">{p.customer_email ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{formatPrice(Number(p.total))}</td>
                      <td className="px-4 py-3 text-right">{formatPrice(Number(p.total_pagado))}</td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: COLORS.red }}>
                        {formatPrice(Number(p.deuda_restante))}
                      </td>
                      <td className="px-4 py-3 text-center"><EstadoBadge estado={p.estado_deuda} /></td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">{p.cantidad_pagos}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
