import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, ShoppingBag, Clock, MessageSquare, AlertTriangle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatPrice';
import { generateUrgentAlerts, generateDailySummary, generateInsights, generateSeasonAlerts, generateRetentionInsights } from '@/lib/insightEngine';
import type { SmartInsight, RetentionInsight } from '@/lib/insightEngine';
import UrgentAlertsLayer from '@/components/admin/UrgentAlerts';
import DailySummaryLayer from '@/components/admin/DailySummary';
import OpportunitiesLayer from '@/components/admin/OpportunitiesLayer';
import RetentionLayer from '@/components/admin/RetentionLayer';
import ActionHistoryModal from '@/components/admin/ActionHistoryModal';
import PendingPaymentsWidget from '@/components/admin/PendingPaymentsWidget';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmado', completed: 'Completado', picked_up: 'Retirado', cancelled: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  pending: '#D4A574', confirmed: '#8B6F47', completed: '#5D4E37', picked_up: '#3D6B4F', cancelled: '#D4B896',
};
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const PAYMENT_LABELS: Record<string, string> = {
  pendiente: 'Pago Pendiente', 'seña_recibida': 'Seña Recibida', 'pagado_completo': 'Pagado',
};

const HourglassEmoji = ({ size: _s, ...props }: any) => <span {...props}>⏳</span>;
const HammerEmoji = ({ size: _s, ...props }: any) => <span {...props}>🔨</span>;

function KpiCard({ icon: Icon, label, value, loading, badge, onClick, borderLeftAccent, valueColor }: { icon: any; label: string; value: string; loading: boolean; badge?: string | null; onClick?: () => void; borderLeftAccent?: string; valueColor?: string }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${borderLeftAccent ? 'border-l-4' : ''} ${onClick ? 'cursor-pointer hover:border-gray-200 transition-colors' : ''}`}
      style={borderLeftAccent ? { borderLeftColor: borderLeftAccent } : undefined}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-cream flex items-center justify-center">
          <Icon size={18} className="text-espresso" />
        </div>
        <span className="text-xs font-semibold text-warm-gray uppercase tracking-wider flex-1 truncate">{label}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>
      {loading ? <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" /> : <p className={`text-2xl font-bold font-display ${!valueColor ? 'text-espresso' : ''}`} style={valueColor ? { color: valueColor } : undefined}>{value}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-dashboard-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['admin-dashboard-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: unreadMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['admin-dashboard-messages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contact_messages').select('*').eq('read', false);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: pendingZumbita, isLoading: zumbitaLoading } = useQuery({
    queryKey: ['admin-dashboard-zumbita'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('zumbita_discount_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: activePromotions, isLoading: promotionsLoading } = useQuery({
    queryKey: ['admin-dashboard-active-promotions'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data: promos, error } = await supabase
        .from('promotions')
        .select('id, title, discount_type, discount_value, start_date, end_date')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${nowIso}`)
        .or(`end_date.is.null,end_date.gte.${nowIso}`)
        .order('end_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      if (!promos || promos.length === 0) return [];

      const ids = promos.map(p => p.id);
      const { data: links } = await supabase
        .from('promotion_products')
        .select('promotion_id, product_id, products(name)')
        .in('promotion_id', ids);

      return promos.map(p => ({
        ...p,
        products: (links || [])
          .filter((l: any) => l.promotion_id === p.id)
          .map((l: any) => l.products?.name)
          .filter(Boolean) as string[],
      }));
    },
  });

  // FIX BUG 1: Monthly sales sums ALL non-cancelled orders in the current month
  const monthlyRevenue = orders?.filter(o => {
    if (o.created_at < monthStart) return false;
    if (o.status === 'cancelled') return false;
    return true;
  }).reduce((s, o) => s + Number(o.total), 0) ?? 0;

  const pendingCount = orders?.filter(o => o.status === 'pending').length ?? 0;
  const prepCount = orders?.filter(o => (o as any).fulfillment_status === 'en_preparacion').length ?? 0;
  const todayPickups = orders?.filter(o => o.desired_date === todayStr && o.status !== 'cancelled').length ?? 0;
  const unreadCount = unreadMessages?.length ?? 0;

  // Last 7 days chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = orders?.filter(o => o.created_at?.startsWith(dateStr)).length ?? 0;
    return { name: DAY_NAMES[d.getDay()], pedidos: count };
  });

  // Status distribution
  const statusCounts = ['pending', 'confirmed', 'completed', 'picked_up', 'cancelled'].map(s => ({
    name: STATUS_LABELS[s], value: orders?.filter(o => o.status === s).length ?? 0, color: STATUS_COLORS[s],
  })).filter(s => s.value > 0);

  // Upcoming pickups
  const ACTIVE_FULFILLMENT = ['pendiente', 'confirmado', 'en_preparacion', 'listo'];
  const upcoming = orders
    ?.filter(o => o.desired_date >= todayStr && o.status !== 'cancelled' && ACTIVE_FULFILLMENT.includes((o as any).fulfillment_status ?? 'pendiente'))
    .sort((a, b) => a.desired_date.localeCompare(b.desired_date))
    .slice(0, 5) ?? [];

  const tomorrowStr = (() => { const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();

  const formatDate = (d: string) => {
    if (!d) return '—';
    const dateObj = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
    if (isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  };

  const getPickupBadge = (date: string) => {
    if (date === todayStr) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">HOY</span>;
    if (date === tomorrowStr) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-bold">MAÑANA</span>;
    return null;
  };

  const getProductSummary = (items: any[]) => {
    if (!items?.length) return '—';
    const first = items[0]?.productName || '—';
    if (items.length === 1) return first;
    return `${first} + ${items.length - 1} más`;
  };

  // Today's Prep
  const prepOrders = orders?.filter(o =>
    (o.desired_date === todayStr || o.desired_date === tomorrowStr) && o.status !== 'cancelled'
  ) ?? [];
  const prepItems: Record<string, { name: string; qty: number }> = {};
  prepOrders.forEach(o => {
    (o.items as any[])?.forEach((item: any) => {
      const key = `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}`;
      if (!prepItems[key]) prepItems[key] = { name: key, qty: 0 };
      prepItems[key].qty += item.quantity || 1;
    });
  });
  const prepList = Object.values(prepItems).sort((a, b) => b.qty - a.qty);

  // ==================== SMART ASSISTANT ====================
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [retentionInsights, setRetentionInsights] = useState<RetentionInsight[]>([]);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [summary, setSummary] = useState<ReturnType<typeof generateDailySummary> | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Urgent alerts recalculate on every load
  const urgentAlerts = orders && unreadMessages
    ? generateUrgentAlerts(orders, unreadMessages, today)
    : [];

  // Generate daily summary
  const refreshSummary = useCallback(() => {
    if (!orders) return;
    setSummaryLoading(true);
    const s = generateDailySummary(orders, products || [], new Date());
    setSummary(s);
    setSummaryLoading(false);
  }, [orders, products]);

  useEffect(() => {
    if (orders && !summary) refreshSummary();
  }, [orders, summary, refreshSummary]);

  // Run analysis
  const runAnalysis = useCallback(() => {
    if (!orders || !products) return;
    setAnalysisRunning(true);
    setTimeout(() => {
      const baseInsights = generateInsights(orders, products, unreadMessages || [], new Date());
      const seasonalInsights = generateSeasonAlerts(new Date());
      const newInsights = [...baseInsights, ...seasonalInsights];
      // Restore dismissed state from localStorage
      const dismissedIds = JSON.parse(localStorage.getItem('dismissed_insights') || '{}');
      const now = Date.now();
      const filtered = newInsights.map(i => ({
        ...i,
        dismissed: dismissedIds[i.id] && (now - dismissedIds[i.id]) < 7 * 86400000,
      }));
      setInsights(filtered);
      // Generate retention insights
      const retention = generateRetentionInsights(orders, products, new Date());
      setRetentionInsights(retention);
      setAnalysisRunning(false);
      setHasAnalyzed(true);
    }, 500);
  }, [orders, products, unreadMessages]);

  // Auto-run on first load
  useEffect(() => {
    if (orders && products && !hasAnalyzed) runAnalysis();
  }, [orders, products, hasAnalyzed, runAnalysis]);

  const dismissInsight = (id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, dismissed: true } : i));
    const dismissed = JSON.parse(localStorage.getItem('dismissed_insights') || '{}');
    dismissed[id] = Date.now();
    localStorage.setItem('dismissed_insights', JSON.stringify(dismissed));
  };

  const logAction = async (entry: any) => {
    try {
      await (supabase.from('assistant_actions_log').insert(entry) as any);
      qc.invalidateQueries({ queryKey: ['assistant-action-log'] });
    } catch (e) { console.error('Log error:', e); }
  };

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-dashboard-orders'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard-messages'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard-products'] });
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-espresso mb-6">Dashboard</h2>

      {/* Pending orders alert */}
      {!isLoading && pendingCount > 0 && (
        <div
          className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => navigate('/admin/pedidos')}
        >
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-semibold">
            Tenés {pendingCount} {pendingCount === 1 ? 'pedido pendiente' : 'pedidos pendientes'} por confirmar
          </p>
          <span className="ml-auto text-xs text-amber-600 font-semibold">Ver →</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <KpiCard
          icon={HourglassEmoji}
          label="Órdenes por Confirmar"
          value={String(pendingCount)}
          loading={isLoading}
          borderLeftAccent="#FF6B6B"
          valueColor="#FF6B6B"
        />
        <KpiCard
          icon={HammerEmoji}
          label="En Preparación"
          value={String(prepCount)}
          loading={isLoading}
          borderLeftAccent="#FFA500"
          valueColor="#FFA500"
        />
        <KpiCard icon={Clock} label="Retiros de Hoy" value={String(todayPickups)} loading={isLoading} />
        <KpiCard icon={MessageSquare} label="Mensajes sin leer" value={String(unreadCount)} loading={messagesLoading} />
        <KpiCard icon={DollarSign} label="Ventas del Mes" value={formatPrice(monthlyRevenue)} loading={isLoading} />
        <KpiCard
          icon={Sparkles}
          label="Solicitudes Zumbita"
          value={String(pendingZumbita ?? 0)}
          loading={zumbitaLoading}
          badge={(pendingZumbita ?? 0) > 0 ? 'Pendientes' : null}
          onClick={() => navigate('/admin/promociones')}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-espresso mb-4">Pedidos — Últimos 7 Días</h3>
          {isLoading ? <div className="h-48 bg-gray-200 animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece8" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5D4E37' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5D4E37' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e0db' }} />
                <Bar dataKey="pedidos" fill="#5D4E37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-espresso mb-4">Pedidos por Estado</h3>
          {isLoading ? <div className="h-48 bg-gray-200 animate-pulse rounded" /> : statusCounts.length === 0 ? (
            <p className="text-warm-gray text-sm pt-8 text-center">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {statusCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e0db' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {statusCounts.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-warm-gray">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.name} ({s.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending payments widget */}
      <div className="mb-8">
        <PendingPaymentsWidget />
      </div>

      {/* Today's Prep */}
      {prepList.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
          <h3 className="text-sm font-semibold text-espresso mb-3">🧁 Preparar para Hoy y Mañana</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prepList.map(item => (
              <div key={item.name} className="flex items-center justify-between bg-cream/50 rounded-lg px-3 py-2">
                <span className="text-sm text-espresso">{item.name}</span>
                <span className="text-sm font-bold text-espresso">x{item.qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming pickups */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
        <h3 className="text-sm font-semibold text-espresso mb-4">Próximos Retiros</h3>
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-200 animate-pulse rounded" />)}</div>
        ) : upcoming.length === 0 ? (
          <p className="text-warm-gray text-sm">No hay retiros próximos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-xs text-warm-gray uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left py-2 pr-3">Cliente</th>
                  <th className="text-left py-2 pr-3">Producto(s)</th>
                  <th className="text-left py-2 pr-3">Retiro</th>
                  <th className="text-left py-2 pr-3">Horario</th>
                  <th className="text-left py-2 pr-3">Estado</th>
                  <th className="text-left py-2">Pago</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-cream/30 cursor-pointer transition-colors" onClick={() => navigate('/admin/pedidos')}>
                    <td className="py-2.5 pr-3 text-espresso font-medium">{o.customer_name}</td>
                    <td className="py-2.5 pr-3 text-warm-gray truncate max-w-[160px]">{getProductSummary(o.items as any[])}</td>
                    <td className="py-2.5 pr-3 text-espresso whitespace-nowrap">{formatDate(o.desired_date)} {getPickupBadge(o.desired_date)}</td>
                    <td className="py-2.5 pr-3 text-warm-gray">{o.preferred_time}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        o.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        o.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        o.status === 'completed' || o.status === 'picked_up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>{STATUS_LABELS[o.status] || o.status}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        o.payment_status === 'pagado_completo' ? 'bg-espresso text-white' :
                        o.payment_status === 'seña_recibida' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-warm-gray'
                      }`}>{PAYMENT_LABELS[o.payment_status] || 'Pago Pendiente'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active promotions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-espresso">Promociones Activas</h3>
          <button
            onClick={() => navigate('/admin/promociones')}
            className="text-xs text-warm-gray hover:text-espresso transition-colors"
          >
            Ver todas →
          </button>
        </div>
        {promotionsLoading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-gray-200 animate-pulse rounded" />)}</div>
        ) : !activePromotions || activePromotions.length === 0 ? (
          <p className="text-warm-gray text-sm">No hay promociones activas en este momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-xs text-warm-gray uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left py-2 pr-3">Promoción</th>
                  <th className="text-left py-2 pr-3">Productos</th>
                  <th className="text-left py-2 pr-3">Descuento</th>
                  <th className="text-left py-2">Vence</th>
                </tr>
              </thead>
              <tbody>
                {activePromotions.map((p: any) => {
                  const productsLabel =
                    p.products.length === 0
                      ? '—'
                      : p.products.length === 1
                        ? p.products[0]
                        : `${p.products[0]} + ${p.products.length - 1} más`;
                  const discountLabel =
                    p.discount_type === 'percentage'
                      ? `${Number(p.discount_value ?? 0)}%`
                      : formatPrice(Number(p.discount_value ?? 0));
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-gray-50 hover:bg-cream/30 cursor-pointer transition-colors"
                      onClick={() => navigate('/admin/promociones')}
                    >
                      <td className="py-2.5 pr-3 text-espresso font-medium truncate max-w-[180px]">
                        {p.title || 'Sin título'}
                      </td>
                      <td className="py-2.5 pr-3 text-warm-gray truncate max-w-[200px]">{productsLabel}</td>
                      <td className="py-2.5 pr-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-cream text-espresso">
                          -{discountLabel}
                        </span>
                      </td>
                      <td className="py-2.5 text-espresso whitespace-nowrap">
                        {p.end_date ? formatDate(p.end_date) : 'Sin vencimiento'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ==================== 3-LAYER ASSISTANT ==================== */}

      {/* Layer 1: Urgent Alerts */}
      <UrgentAlertsLayer alerts={urgentAlerts} onRefresh={refreshAll} onLogAction={logAction} />

      {/* Layer 2: Daily Summary */}
      <DailySummaryLayer summary={summary} onRefresh={refreshSummary} loading={summaryLoading} />

      {/* Layer 3: Opportunities */}
      <OpportunitiesLayer
        insights={insights}
        running={analysisRunning}
        onAnalyze={runAnalysis}
        onDismiss={dismissInsight}
        onLogAction={logAction}
        onRefresh={refreshAll}
      />

      {/* Layer 4: Client Retention */}
      <RetentionLayer insights={retentionInsights} />

      {/* Action History Link */}
      <div className="text-center mt-2 mb-8">
        <button onClick={() => setShowHistory(true)} className="text-sm text-warm-gray underline underline-offset-2 hover:text-espresso transition-colors">
          📜 Historial de acciones
        </button>
      </div>

      <ActionHistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}
