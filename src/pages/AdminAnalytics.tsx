import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, CheckCircle, ShoppingBag, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatPrice';
import { useCategories, buildCategoryLabels } from '@/hooks/useCategories';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const PERIOD_OPTIONS = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '3 meses' },
  { value: 0, label: 'Todo' },
];
const CAT_COLORS = ['#5D4E37', '#8B6F47', '#D4A574', '#D4B896', '#A08060', '#C4A882'];

function KpiCard({ icon: Icon, label, value, loading }: { icon: any; label: string; value: string; loading: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-cream flex items-center justify-center">
          <Icon size={18} className="text-espresso" />
        </div>
        <span className="text-xs font-semibold text-warm-gray uppercase tracking-wider">{label}</span>
      </div>
      {loading ? <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" /> : <p className="text-2xl font-bold text-espresso font-display">{value}</p>}
    </div>
  );
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState(30);
  const { data: dbCategories } = useCategories();
  const categoryLabels = buildCategoryLabels(dbCategories);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-analytics-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['admin-analytics-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data as any[];
    },
  });

  const now = new Date();
  const periodStart = period > 0 ? new Date(now.getTime() - period * 86400000).toISOString() : '';
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const periodOrders = useMemo(() => period > 0 ? orders?.filter(o => o.created_at >= periodStart) || [] : orders || [], [orders, period, periodStart]);
  const completedPeriod = periodOrders.filter(o => o.status === 'completed');
  const thisMonthOrders = orders?.filter(o => o.created_at >= monthStart) || [];
  const lastMonthOrders = orders?.filter(o => o.created_at >= lastMonthStart && o.created_at <= lastMonthEnd) || [];
  const thisMonthCompleted = thisMonthOrders.filter(o => o.status === 'completed');
  const lastMonthCompleted = lastMonthOrders.filter(o => o.status === 'completed');

  const monthRevenue = thisMonthCompleted.reduce((s, o) => s + Number(o.total), 0);
  const avgTicket = thisMonthCompleted.length > 0 ? monthRevenue / thisMonthCompleted.length : 0;
  const completionRate = thisMonthOrders.length > 0 ? Math.round((thisMonthCompleted.length / thisMonthOrders.length) * 100) : 0;
  const lastMonthRevenue = lastMonthCompleted.reduce((s, o) => s + Number(o.total), 0);
  const revChange = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

  // Revenue chart (daily)
  const revenueChart = useMemo(() => {
    const days = period > 0 ? period : 90;
    return Array.from({ length: Math.min(days, 60) }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      const rev = completedPeriod.filter(o => o.created_at?.startsWith(dateStr)).reduce((s, o) => s + Number(o.total), 0);
      return { date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), ingresos: rev };
    });
  }, [completedPeriod, period]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    periodOrders.filter(o => o.status !== 'cancelled').forEach(o => {
      (o.items as any[])?.forEach((item: any) => {
        const key = item.productName || 'Desconocido';
        if (!map[key]) map[key] = { name: key, count: 0 };
        map[key].count += item.quantity || 1;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [periodOrders]);

  // Category distribution
  const categoryDist = useMemo(() => {
    const map: Record<string, number> = {};
    periodOrders.filter(o => o.status !== 'cancelled').forEach(o => {
      (o.items as any[])?.forEach((item: any) => {
        const p = products?.find(pr => pr.id === item.productId);
        const cat = p?.category || 'otros';
        map[cat] = (map[cat] || 0) + (item.quantity || 1);
      });
    });
    return Object.entries(map).map(([cat, value], i) => ({
      name: categoryLabels[cat] || cat, value, color: CAT_COLORS[i % CAT_COLORS.length],
    }));
  }, [periodOrders, products]);

  // Day of week
  const dayOfWeek = useMemo(() => {
    const counts = Array(7).fill(0);
    periodOrders.forEach(o => { const d = new Date(o.created_at).getDay(); counts[d]++; });
    return DAY_NAMES.map((name, i) => ({ name, pedidos: counts[i] }));
  }, [periodOrders]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-display text-2xl font-bold text-espresso">Estadísticas</h2>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${period === p.value ? 'bg-espresso text-white' : 'bg-cream text-warm-gray hover:bg-blush'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={DollarSign} label="Ingreso Total (Mes)" value={formatPrice(monthRevenue)} loading={isLoading} />
        <KpiCard icon={TrendingUp} label="Ticket Promedio" value={formatPrice(avgTicket)} loading={isLoading} />
        <KpiCard icon={CheckCircle} label="Tasa de Completado" value={`${completionRate}%`} loading={isLoading} />
        <KpiCard icon={ShoppingBag} label="Total Pedidos (Mes)" value={String(thisMonthOrders.length)} loading={isLoading} />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
        <h3 className="text-sm font-semibold text-espresso mb-4">Ingresos — Últimos {period || 90} Días</h3>
        {isLoading ? <div className="h-52 bg-gray-200 animate-pulse rounded" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ece8" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5D4E37' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#5D4E37' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e5e0db' }} />
              <Line type="monotone" dataKey="ingresos" stroke="#5D4E37" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-espresso mb-4">Productos Más Vendidos (Top 5)</h3>
          {isLoading ? <div className="h-48 bg-gray-200 animate-pulse rounded" /> : topProducts.length === 0 ? (
            <p className="text-warm-gray text-sm text-center pt-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece8" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#5D4E37' }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: '#5D4E37' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e0db' }} />
                <Bar dataKey="count" fill="#8B6F47" radius={[0, 4, 4, 0]} name="Unidades" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-espresso mb-4">Pedidos por Categoría</h3>
          {isLoading ? <div className="h-48 bg-gray-200 animate-pulse rounded" /> : categoryDist.length === 0 ? (
            <p className="text-warm-gray text-sm text-center pt-8">Sin datos</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {categoryDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e0db' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center">
                {categoryDist.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-warm-gray">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Day of week */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
        <h3 className="text-sm font-semibold text-espresso mb-4">Pedidos por Día de la Semana</h3>
        {isLoading ? <div className="h-48 bg-gray-200 animate-pulse rounded" /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ece8" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5D4E37' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5D4E37' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e0db' }} />
              <Bar dataKey="pedidos" fill="#D4A574" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
          <p className="text-xs text-warm-gray uppercase tracking-wider mb-2">Este Mes</p>
          {isLoading ? <div className="h-8 w-24 mx-auto bg-gray-200 animate-pulse rounded" /> : (
            <>
              <p className="text-2xl font-bold text-espresso font-display">{formatPrice(monthRevenue)}</p>
              <p className="text-xs text-warm-gray mt-1">{thisMonthOrders.length} pedidos</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-center">
          {isLoading ? <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" /> : (
            <div className={`flex items-center gap-1 text-lg font-bold ${revChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {revChange >= 0 ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
              {Math.abs(revChange)}%
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
          <p className="text-xs text-warm-gray uppercase tracking-wider mb-2">Mes Anterior</p>
          {isLoading ? <div className="h-8 w-24 mx-auto bg-gray-200 animate-pulse rounded" /> : (
            <>
              <p className="text-2xl font-bold text-espresso font-display">{formatPrice(lastMonthRevenue)}</p>
              <p className="text-xs text-warm-gray mt-1">{lastMonthOrders.length} pedidos</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
