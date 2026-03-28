import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronDown, ChevronUp, Download, MessageCircle, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatPrice';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};
const PAYMENT_LABELS: Record<string, string> = {
  pendiente: 'Pago Pendiente',
  'seña_recibida': 'Seña Recibida',
  'pagado_completo': 'Pagado',
};
const PAYMENT_COLORS: Record<string, string> = {
  pendiente: 'bg-gray-100 text-warm-gray',
  'seña_recibida': 'bg-amber-100 text-amber-800',
  'pagado_completo': 'bg-espresso text-white',
};
const DATE_FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'manana', label: 'Mañana' },
  { value: 'semana', label: 'Esta semana' },
];
const PAGE_SIZE = 10;

function cleanPhone(phone: string): string {
  const digits = phone.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+54') || digits.startsWith('54')) return digits.replace('+', '');
  if (/^[23]\d{9}$/.test(digits)) return `549${digits}`;
  return digits;
}

function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(message)}`;
}

export default function AdminPedidos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('todos');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = (() => { const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();
  const weekEnd = (() => { const d = new Date(today); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Estado actualizado'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, payment_status }: { id: string; payment_status: string }) => {
      const { error } = await supabase.from('orders').update({ payment_status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Estado de pago actualizado'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); },
  });

  const filtered = useMemo(() => {
    return orders?.filter(o => {
      const matchSearch = o.customer_name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'todos' || o.status === statusFilter;
      let matchDate = true;
      if (dateFilter === 'hoy') matchDate = o.desired_date === todayStr;
      else if (dateFilter === 'manana') matchDate = o.desired_date === tomorrowStr;
      else if (dateFilter === 'semana') matchDate = o.desired_date >= todayStr && o.desired_date <= weekEnd;
      return matchSearch && matchStatus && matchDate;
    });
  }, [orders, search, statusFilter, dateFilter, todayStr, tomorrowStr, weekEnd]);

  // Status counts
  const statusCounts = useMemo(() => {
    if (!orders) return {};
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  }, [orders]);

  const totalPages = Math.ceil((filtered?.length || 0) / PAGE_SIZE);
  const paginated = filtered?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const getProductSummary = (items: any[]) => {
    if (!items?.length) return '';
    const first = items[0]?.productName || '';
    if (items.length === 1) return first;
    return `${first} + ${items.length - 1} más`;
  };

  const getUrgencyBorder = (o: any) => {
    if (o.desired_date < todayStr && (o.status === 'pending' || o.status === 'confirmed')) return 'border-l-4 border-l-red-500';
    if (o.desired_date === todayStr) return 'border-l-4 border-l-red-400';
    if (o.desired_date === tomorrowStr) return 'border-l-4 border-l-amber-400';
    return '';
  };

  const exportCSV = () => {
    if (!filtered?.length) return;
    const headers = ['ID', 'Cliente', 'Email', 'Teléfono', 'Fecha Pedido', 'Fecha Retiro', 'Horario', 'Productos', 'Total', 'Estado', 'Estado de Pago', 'Notas'];
    const rows = filtered.map(o => [
      o.id.slice(0, 8).toUpperCase(),
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      formatDate(o.created_at),
      formatDate(o.desired_date),
      o.preferred_time,
      (o.items as any[]).map((i: any) => `${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity}`).join('; '),
      o.total,
      STATUS_LABELS[o.status] || o.status,
      PAYMENT_LABELS[o.payment_status] || 'Pendiente',
      o.notes || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pedidos_${todayStr}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const getWhatsAppMessages = (o: any) => {
    const products = (o.items as any[]).map((i: any) => `• ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity}`).join('\n');
    return {
      confirm: `¡Hola ${o.customer_name}! 🎂 Confirmamos tu pedido de Le Sucrée:\n\n📦 ${products}\n\n💰 Total: ${formatPrice(o.total)}\n📅 Retiro: ${formatDate(o.desired_date)} — ${o.preferred_time}\n📍 Rosario, Santa Fe\n\n¡Te esperamos! 🤎`,
      remind: `¡Hola ${o.customer_name}! 🎂 Te recordamos que tu pedido de Le Sucrée está listo para retirar:\n\n📅 ${formatDate(o.desired_date)} — ${o.preferred_time}\n📍 Rosario, Santa Fe\n\n¡Te esperamos! 🤎`,
      ready: `¡Hola ${o.customer_name}! 🎂 Tu pedido de Le Sucrée está listo para retirar.\n\n📍 Rosario, Santa Fe\n\n¡Te esperamos! 🤎`,
    };
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-espresso mb-6">Pedidos</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
          <input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full sm:w-64 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
        >
          <option value="todos">Todos los estados</option>
          <option value="pending">Pendiente ({statusCounts.pending || 0})</option>
          <option value="confirmed">Confirmado ({statusCounts.confirmed || 0})</option>
          <option value="completed">Completado ({statusCounts.completed || 0})</option>
          <option value="cancelled">Cancelado ({statusCounts.cancelled || 0})</option>
        </select>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-warm-gray hover:bg-cream/50 transition-colors">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* Date filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {DATE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setDateFilter(f.value); setPage(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              dateFilter === f.value ? 'bg-espresso text-white' : 'bg-cream text-warm-gray hover:bg-blush'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs text-warm-gray mb-3">Mostrando {filtered?.length ?? 0} pedidos</p>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex gap-4">
                <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : !paginated?.length ? (
        <div className="text-center py-12">
          <ShoppingBag size={40} className="mx-auto text-warm-gray/30 mb-3" />
          <p className="text-warm-gray">No hay pedidos todavía.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(o => {
              const msgs = getWhatsAppMessages(o);
              const isOverdue = o.desired_date < todayStr && (o.status === 'pending' || o.status === 'confirmed');
              return (
                <div key={o.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${getUrgencyBorder(o)}`}>
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-cream/30 transition-colors"
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  >
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <span className="text-xs font-mono text-warm-gray">#{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className="font-semibold text-sm text-espresso">{o.customer_name}</span>
                      <span className="text-xs text-warm-gray">{formatDate(o.created_at)}</span>
                      <span className="text-xs text-warm-gray">Retiro: {formatDate(o.desired_date)}</span>
                      <span className="font-semibold text-sm text-espresso">{formatPrice(o.total)}</span>
                      <span className="text-xs text-warm-gray truncate max-w-[150px]">{getProductSummary(o.items as any[])}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status] || ''}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PAYMENT_COLORS[o.payment_status] || PAYMENT_COLORS.pendiente}`}>
                        {PAYMENT_LABELS[o.payment_status] || 'Pago Pendiente'}
                      </span>
                      {isOverdue && <span className="text-xs text-red-600 font-semibold">⚠️ Retiro vencido</span>}
                    </div>
                    {expanded === o.id ? <ChevronUp size={16} className="text-warm-gray flex-shrink-0" /> : <ChevronDown size={16} className="text-warm-gray flex-shrink-0" />}
                  </div>
                  {expanded === o.id && (
                    <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div><span className="text-warm-gray">Tel:</span> <span className="text-espresso">{o.customer_phone}</span></div>
                        <div><span className="text-warm-gray">Email:</span> <span className="text-espresso">{o.customer_email}</span></div>
                        <div><span className="text-warm-gray">Horario:</span> <span className="text-espresso">{o.preferred_time}</span></div>
                      </div>
                      {o.notes && <p className="text-sm text-warm-gray bg-cream/50 rounded-lg p-3">{o.notes}</p>}
                      <div className="space-y-1">
                        {(o.items as any[]).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-espresso">
                              {item.productName}{item.variantLabel ? ` — ${item.variantLabel}` : ''} x{item.quantity}
                            </span>
                            <span className="text-espresso font-semibold">{formatPrice(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-warm-gray uppercase">Estado:</label>
                          <select
                            value={o.status}
                            onChange={e => updateStatus.mutate({ id: o.id, status: e.target.value })}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
                          >
                            <option value="pending">Pendiente</option>
                            <option value="confirmed">Confirmado</option>
                            <option value="completed">Completado</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-warm-gray uppercase">Pago:</label>
                          <select
                            value={o.payment_status || 'pendiente'}
                            onChange={e => updatePayment.mutate({ id: o.id, payment_status: e.target.value })}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="seña_recibida">Seña Recibida</option>
                            <option value="pagado_completo">Pagado Completo</option>
                          </select>
                        </div>
                      </div>
                      {/* WhatsApp actions */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <a href={buildWhatsAppUrl(o.customer_phone, msgs.confirm)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-warm-gray hover:bg-cream/50 transition-colors">
                          <MessageCircle size={13} className="text-green-600" /> Confirmar
                        </a>
                        <a href={buildWhatsAppUrl(o.customer_phone, msgs.remind)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-warm-gray hover:bg-cream/50 transition-colors">
                          <MessageCircle size={13} className="text-green-600" /> Recordar Retiro
                        </a>
                        <a href={buildWhatsAppUrl(o.customer_phone, msgs.ready)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-warm-gray hover:bg-cream/50 transition-colors">
                          <MessageCircle size={13} className="text-green-600" /> Pedido Listo
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${page === i ? 'bg-dusty-pink text-white' : 'text-warm-gray hover:bg-blush'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
