import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, CheckCircle, ShoppingBag, ArrowUp, ArrowDown, Download, Package } from 'lucide-react';
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
const INTERNAL_CATS = ['bares', 'bares_cookies'];

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
    queryKey: ['admin-analytics-orders', period],
    queryFn: async () => {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (period > 0) {
        const periodStart = new Date(Date.now() - period * 86400000).toISOString();
        query = query.gte('created_at', periodStart);
      }
      const { data, error } = await query;
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

  // FIX BUG 1 & 3: Include all non-cancelled orders for revenue (not just completed)
  const periodOrders = useMemo(() => {
    const base = orders?.filter(o => o.status !== 'cancelled') || [];
    return period > 0 ? base.filter(o => o.created_at >= periodStart) : base;
  }, [orders, period, periodStart]);

  const thisMonthOrders = useMemo(() => orders?.filter(o => o.created_at >= monthStart && o.status !== 'cancelled') || [], [orders, monthStart]);
  const lastMonthOrders = useMemo(() => orders?.filter(o => o.created_at >= lastMonthStart && o.created_at <= lastMonthEnd && o.status !== 'cancelled') || [], [orders, lastMonthStart, lastMonthEnd]);

  const monthRevenue = thisMonthOrders.reduce((s, o) => s + Number(o.total), 0);
  const avgTicket = thisMonthOrders.length > 0 ? Math.round(monthRevenue / thisMonthOrders.length) : 0;

  const allMonthOrders = orders?.filter(o => o.created_at >= monthStart) || [];
  const completedThisMonth = allMonthOrders.filter(o => o.status === 'completed' || o.status === 'picked_up').length;
  const completionRate = allMonthOrders.length > 0 ? Math.round((completedThisMonth / allMonthOrders.length) * 100) : 0;

  const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + Number(o.total), 0);
  const revChange = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

  // Revenue chart (daily) - all non-cancelled
  const revenueChart = useMemo(() => {
    const days = period > 0 ? period : 90;
    return Array.from({ length: Math.min(days, 60) }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      const rev = periodOrders.filter(o => o.created_at?.startsWith(dateStr)).reduce((s, o) => s + Number(o.total), 0);
      return { date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), ingresos: rev };
    });
  }, [periodOrders, period]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    periodOrders.forEach(o => {
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
    periodOrders.forEach(o => {
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
        <h2 className="font-display text-2xl font-bold text-espresso">Estadísticas Generales</h2>
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
              <p className="text-xs text-warm-gray mt-1">{thisMonthOrders.length} {thisMonthOrders.length === 1 ? 'pedido' : 'pedidos'}</p>
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
              <p className="text-xs text-warm-gray mt-1">{lastMonthOrders.length} {lastMonthOrders.length === 1 ? 'pedido' : 'pedidos'}</p>
            </>
          )}
        </div>
      </div>

      {/* === INTERNAL PRODUCTS SECTION === */}
      <InternalProductsSection orders={orders} products={products} isLoading={isLoading} />
    </div>
  );
}

// ============================================================
// Internal Products Statistics (bares + bares_cookies)
// ============================================================
function InternalProductsSection({ orders, products, isLoading }: { orders: any[] | undefined; products: any[] | undefined; isLoading: boolean }) {
  const [period, setPeriod] = useState(30);
  const now = new Date();
  const periodStart = period > 0 ? new Date(now.getTime() - period * 86400000).toISOString() : '';

  // Map productName -> category for fast lookup
  const productCatByName = useMemo(() => {
    const m: Record<string, string> = {};
    (products || []).forEach(p => { m[p.name] = p.category; });
    return m;
  }, [products]);

  // Filter: keep only items in internal categories, keep order if any item internal
  const internalOrders = useMemo(() => {
    const base = (orders || []).filter(o => o.status !== 'cancelled');
    const scoped = period > 0 ? base.filter(o => o.created_at >= periodStart) : base;
    return scoped
      .map(o => {
        const items = (o.items as any[] || []).filter((it: any) => {
          // item may carry category directly (manual order) or via product lookup
          const cat = it.category || productCatByName[it.productName] || '';
          return INTERNAL_CATS.includes(cat);
        });
        return items.length > 0 ? { ...o, _internalItems: items } : null;
      })
      .filter(Boolean) as any[];
  }, [orders, products, period, periodStart, productCatByName]);

  // Revenue: sum of internal item lines. If unit prices aren't stored on items, use full order total proportionally;
  // fallback: full order.total when only internal items exist in the order.
  const internalRevenue = useMemo(() => {
    return internalOrders.reduce((sum, o) => {
      const totalItems = (o.items as any[] || []).length;
      const intItems = o._internalItems.length;
      const lineSum = o._internalItems.reduce((s: number, it: any) => s + Number(it.price || it.unitPrice || 0) * (it.quantity || 1), 0);
      if (lineSum > 0) return sum + lineSum;
      // proportional fallback
      return sum + (Number(o.total) || 0) * (totalItems ? intItems / totalItems : 1);
    }, 0);
  }, [internalOrders]);

  const internalOrderCount = internalOrders.length;
  const avgTicket = internalOrderCount > 0 ? Math.round(internalRevenue / internalOrderCount) : 0;

  const uniqueProducts = useMemo(() => {
    const s = new Set<string>();
    internalOrders.forEach(o => o._internalItems.forEach((it: any) => s.add(it.productName)));
    return s.size;
  }, [internalOrders]);

  // Top products grouped by category
  const topByCat = useMemo(() => {
    const acc: Record<string, Record<string, { revenue: number; count: number }>> = { bares: {}, bares_cookies: {} };
    internalOrders.forEach(o => {
      o._internalItems.forEach((it: any) => {
        const cat = it.category || productCatByName[it.productName] || '';
        if (!INTERNAL_CATS.includes(cat)) return;
        const r = Number(it.price || it.unitPrice || 0) * (it.quantity || 1);
        const slot = acc[cat][it.productName] ||= { revenue: 0, count: 0 };
        slot.revenue += r;
        slot.count += it.quantity || 1;
      });
    });
    const toList = (cat: string) =>
      Object.entries(acc[cat]).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue || b.count - a.count).slice(0, 5);
    return { bares: toList('bares'), bares_cookies: toList('bares_cookies') };
  }, [internalOrders, productCatByName]);

  // Revenue chart
  const revenueChart = useMemo(() => {
    const days = period > 0 ? period : 90;
    return Array.from({ length: Math.min(days, 60) }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      const rev = internalOrders.filter(o => o.created_at?.startsWith(dateStr)).reduce((s, o) => {
        const lineSum = o._internalItems.reduce((acc: number, it: any) => acc + Number(it.price || it.unitPrice || 0) * (it.quantity || 1), 0);
        if (lineSum > 0) return s + lineSum;
        const totalItems = (o.items as any[] || []).length;
        return s + (Number(o.total) || 0) * (totalItems ? o._internalItems.length / totalItems : 1);
      }, 0);
      return { date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), ingresos: rev };
    });
  }, [internalOrders, period]);

  // Top products bar
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    internalOrders.forEach(o => o._internalItems.forEach((it: any) => {
      const k = it.productName || 'Desconocido';
      map[k] ||= { name: k, count: 0 };
      map[k].count += it.quantity || 1;
    }));
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [internalOrders]);

  // Pie by internal category
  const catPie = useMemo(() => {
    const m: Record<string, number> = {};
    internalOrders.forEach(o => o._internalItems.forEach((it: any) => {
      const cat = it.category || productCatByName[it.productName] || 'otros';
      m[cat] = (m[cat] || 0) + (it.quantity || 1);
    }));
    return Object.entries(m).map(([cat, value], i) => ({
      name: cat === 'bares' ? 'Bares' : cat === 'bares_cookies' ? 'Bares Cookies-Alfajores' : cat,
      value, color: CAT_COLORS[i % CAT_COLORS.length],
    }));
  }, [internalOrders, productCatByName]);

  const exportCSV = () => {
    const rows = [['Fecha', 'Cliente', 'Producto', 'Categoría', 'Cantidad', 'Subtotal']];
    internalOrders.forEach(o => {
      o._internalItems.forEach((it: any) => {
        const cat = it.category || productCatByName[it.productName] || '';
        const sub = Number(it.price || it.unitPrice || 0) * (it.quantity || 1);
        rows.push([
          new Date(o.created_at).toLocaleDateString('es-AR'),
          o.customer_name || '',
          it.productName || '',
          cat === 'bares' ? 'Bares' : 'Bares Cookies-Alfajores',
          String(it.quantity || 1),
          String(sub),
        ]);
      });
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productos-internos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-12 pt-8 border-t border-blush">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-espresso flex items-center gap-2">
            <Package size={22} /> Estadísticas de Productos Internos
          </h2>
          <p className="text-xs text-warm-gray mt-1">Bares y Bares Cookies-Alfajores</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {PERIOD_OPTIONS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${period === p.value ? 'bg-espresso text-white' : 'bg-cream text-warm-gray hover:bg-blush'}`}>
              {p.label}
            </button>
          ))}
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-espresso text-white hover:bg-espresso/90">
            <Download size={12} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={DollarSign} label="Ingresos Internos" value={formatPrice(Math.round(internalRevenue))} loading={isLoading} />
        <KpiCard icon={TrendingUp} label="Ticket Promedio" value={formatPrice(avgTicket)} loading={isLoading} />
        <KpiCard icon={ShoppingBag} label="Pedidos Internos" value={String(internalOrderCount)} loading={isLoading} />
        <KpiCard icon={CheckCircle} label="Productos Únicos" value={String(uniqueProducts)} loading={isLoading} />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
        <h3 className="text-sm font-semibold text-espresso mb-4">Ingresos Internos — Últimos {period || 90} Días</h3>
        {isLoading ? <div className="h-52 bg-gray-200 animate-pulse rounded" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ece8" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5D4E37' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#5D4E37' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e5e0db' }} />
              <Line type="monotone" dataKey="ingresos" stroke="#8B6F47" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top products + pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-espresso mb-4">Top Productos Internos</h3>
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
          <h3 className="text-sm font-semibold text-espresso mb-4">Pedidos por Categoría Interna</h3>
          {isLoading ? <div className="h-48 bg-gray-200 animate-pulse rounded" /> : catPie.length === 0 ? (
            <p className="text-warm-gray text-sm text-center pt-8">Sin datos</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={catPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {catPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e0db' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center">
                {catPie.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-warm-gray">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Breakdown by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(['bares', 'bares_cookies'] as const).map(cat => (
          <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-espresso mb-4">
              {cat === 'bares' ? 'Bares — Top por Ingresos' : 'Bares Cookies-Alfajores — Top por Ingresos'}
            </h3>
            {topByCat[cat].length === 0 ? (
              <p className="text-warm-gray text-sm">Sin datos en el período</p>
            ) : (
              <ul className="divide-y divide-blush">
                {topByCat[cat].map(p => (
                  <li key={p.name} className="flex justify-between items-center py-2 text-sm">
                    <span className="text-espresso">{p.name}</span>
                    <span className="text-warm-gray text-xs">
                      {p.count} u. · <span className="font-semibold text-espresso">{formatPrice(Math.round(p.revenue))}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

