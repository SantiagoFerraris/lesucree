import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, ChevronDown, ChevronUp, Users, Trash2, MessageCircle, TrendingUp, DollarSign, UserCheck, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatPrice';
import { buildWhatsAppUrl } from '@/lib/insightEngine';
import { Checkbox } from '@/components/ui/checkbox';
import ActionConfirmModal from '@/components/admin/ActionConfirmModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_SIZE = 10;

type Segment = 'all' | 'loyal' | 'recurring' | 'new' | 'inactive';
const SEGMENT_OPTIONS: { value: Segment; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'recurring', label: 'Frecuentes' },
  { value: 'loyal', label: 'Fieles' },
  { value: 'inactive', label: 'Inactivos' },
];
const SEGMENT_STYLES: Record<string, string> = {
  loyal: 'bg-amber-100 text-amber-700',
  recurring: 'bg-amber-100 text-amber-700',
  new: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-700',
};
const SEGMENT_LABELS: Record<string, string> = {
  loyal: '⭐ Fiel',
  recurring: '🔁 Frecuente',
  new: '🟢 Nuevo',
  inactive: '🔴 Inactivo',
};

const MSG_TEMPLATES = [
  { value: 'custom', label: 'Escribir libre' },
  { value: 'reactivation', label: 'Reactivación', text: '¡Hola! 🎂 Desde Le Sucrée te extrañamos. Tenemos novedades. ¡Esperamos tu próximo pedido! 🤎' },
  { value: 'news', label: 'Novedad', text: '¡Hola! 🆕 En Le Sucrée tenemos algo nuevo para vos. Consultanos. 🤎' },
  { value: 'thanks', label: 'Agradecimiento', text: '¡Hola! Desde Le Sucrée queremos agradecerte por elegirnos. ¡Sos parte de nuestra familia! 🤎' },
];

export default function AdminClientes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<Segment>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ keys: string[]; emails: string[]; names: string[] } | null>(null);
  const [groupModal, setGroupModal] = useState(false);
  const [groupMessage, setGroupMessage] = useState('');
  const [groupTemplate, setGroupTemplate] = useState('custom');
  const [whatsappModal, setWhatsappModal] = useState<any>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-customers-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  const customers = useMemo(() => {
    if (!orders) return [];
    const map: Record<string, { name: string; email: string; phone: string; orders: any[]; totalSpent: number; lastOrder: string; firstOrder: string }> = {};
    const getKey = (o: any) => (o.customer_email && o.customer_email !== 'importado@lesucree.com') ? o.customer_email : o.customer_name;
    orders.forEach(o => {
      const key = getKey(o);
      if (!map[key]) map[key] = { name: o.customer_name, email: (o.customer_email && o.customer_email !== 'importado@lesucree.com') ? o.customer_email : '', phone: o.customer_phone, orders: [], totalSpent: 0, lastOrder: o.created_at, firstOrder: o.created_at };
      map[key].orders.push(o);
      if (o.status !== 'cancelled') map[key].totalSpent += Number(o.total);
      if (o.created_at > map[key].lastOrder) map[key].lastOrder = o.created_at;
      if (o.created_at < map[key].firstOrder) map[key].firstOrder = o.created_at;
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const getSegment = (c: typeof customers[0]): string => {
    if (c.orders.length >= 3) return 'loyal';
    if (c.orders.length === 2) return 'recurring';
    if (c.orders.length === 1 && c.firstOrder >= thirtyDaysAgo) return 'new';
    if (c.lastOrder < thirtyDaysAgo) return 'inactive';
    return 'new';
  };

  const getFrequency = (c: typeof customers[0]): string => {
    if (c.orders.length < 2) return c.orders.length === 1 ? `Primera compra el ${formatDate(c.firstOrder)}` : '';
    const dates = c.orders.map(o => new Date(o.created_at).getTime()).sort((a, b) => a - b);
    let totalDiff = 0;
    for (let i = 1; i < dates.length; i++) totalDiff += dates[i] - dates[i - 1];
    const avgDays = Math.round(totalDiff / (dates.length - 1) / 86400000);
    return `Frecuencia: Pide cada ~${avgDays} días`;
  };

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchSegment = segmentFilter === 'all' || getSegment(c) === segmentFilter;
    return matchSearch && matchSegment;
  });

  // KPIs
  const totalCustomers = customers.length;
  const retentionCount = customers.filter(c => c.orders.length > 1).length;
  const retentionRate = totalCustomers > 0 ? Math.round((retentionCount / totalCustomers) * 100) : 0;
  const avgTicket = totalCustomers > 0 ? customers.reduce((s, c) => s + c.totalSpent, 0) / totalCustomers : 0;
  const mostValuable = customers[0];

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (d: string) => {
    if (!d) return '—';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const STATUS_LABELS: Record<string, string> = { pending: 'Pendiente', confirmed: 'Confirmado', completed: 'Completado', picked_up: 'Retirado', cancelled: 'Cancelado' };

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Nombre', 'Email', 'Teléfono', 'Total Pedidos', 'Total Gastado', 'Último Pedido', 'Segmento'];
    const rows = filtered.map(c => [c.name, c.email, c.phone, c.orders.length, c.totalSpent, formatDate(c.lastOrder), SEGMENT_LABELS[getSegment(c)]]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteCustomers = useMutation({
    mutationFn: async (keys: { email: string; name: string }[]) => {
      for (const k of keys) {
        if (k.email) {
          await supabase.from('orders').delete().eq('customer_email', k.email);
          await supabase.from('contact_messages').delete().eq('email', k.email);
        } else {
          await supabase.from('orders').delete().eq('customer_name', k.name).eq('customer_email', '');
        }
      }
    },
    onSuccess: () => {
      toast.success('Cliente(s) eliminado(s) correctamente');
      setSelected(new Set()); setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['admin-customers-orders'] });
    },
    onError: () => toast.error('Error al eliminar. Intentá de nuevo.'),
  });

  const clientKey = (c: { email: string; name: string }) => c.email || c.name;
  const handleDeleteClick = (customer: typeof customers[0]) => {
    const key = clientKey(customer);
    setDeleteTarget({ keys: [key], emails: [customer.email], names: [customer.name] });
  };
  const handleBulkDelete = () => {
    const targets = filtered.filter(c => selected.has(clientKey(c)));
    setDeleteTarget({ keys: targets.map(c => clientKey(c)), emails: targets.map(c => c.email), names: targets.map(c => c.name) });
  };
  const confirmDelete = () => { if (deleteTarget) deleteCustomers.mutate(deleteTarget.emails.map((e, i) => ({ email: e, name: deleteTarget.names[i] }))); };
  const toggleSelect = (key: string) => { setSelected(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }); };
  const toggleSelectAll = () => { if (selected.size === paginated.length) setSelected(new Set()); else setSelected(new Set(paginated.map(c => clientKey(c)))); };
  const allPageSelected = paginated.length > 0 && paginated.every(c => selected.has(clientKey(c)));

  const selectedClients = filtered.filter(c => selected.has(clientKey(c)));

  const handleGroupSend = () => {
    selectedClients.forEach((c, i) => {
      setTimeout(() => {
        window.open(buildWhatsAppUrl(c.phone, groupMessage), '_blank');
      }, i * 1000);
    });
    toast.success(`WhatsApp abierto para ${selectedClients.length} clientes ✓`);
    setGroupModal(false);
    setSelected(new Set());
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-espresso mb-6">Clientes</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-espresso" />
            <span className="text-xs text-warm-gray font-semibold uppercase">Clientes totales</span>
          </div>
          <p className="text-2xl font-bold text-espresso font-display">{isLoading ? '—' : totalCustomers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={16} className="text-espresso" />
            <span className="text-xs text-warm-gray font-semibold uppercase">Tasa de retención</span>
          </div>
          <p className="text-2xl font-bold text-espresso font-display">{isLoading ? '—' : `${retentionRate}%`}</p>
          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1.5">
            <div className="h-full bg-espresso rounded-full transition-all" style={{ width: `${retentionRate}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-espresso" />
            <span className="text-xs text-warm-gray font-semibold uppercase">Ticket promedio</span>
          </div>
          <p className="text-2xl font-bold text-espresso font-display">{isLoading ? '—' : formatPrice(avgTicket)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={16} className="text-espresso" />
            <span className="text-xs text-warm-gray font-semibold uppercase">Cliente más valioso</span>
          </div>
          {mostValuable ? (
            <>
              <p className="text-lg font-bold text-espresso font-display truncate">{mostValuable.name}</p>
              <p className="text-xs text-warm-gray">{formatPrice(mostValuable.totalSpent)} en {mostValuable.orders.length} {mostValuable.orders.length === 1 ? 'pedido' : 'pedidos'}</p>
            </>
          ) : <p className="text-lg font-bold text-espresso">—</p>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
          <input placeholder="Buscar por nombre o email..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); setSelected(new Set()); }}
            className="w-full sm:w-80 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30" />
        </div>
        <select value={segmentFilter} onChange={e => { setSegmentFilter(e.target.value as Segment); setPage(0); setSelected(new Set()); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30">
          {SEGMENT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-sm text-red-600 font-semibold hover:bg-red-100 transition-colors">
              <Trash2 size={14} /> Eliminar ({selected.size})
            </button>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-warm-gray hover:bg-cream/50 transition-colors">
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-200 animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users size={40} className="mx-auto text-warm-gray/30 mb-3" />
          <p className="text-warm-gray">Todavía no hay clientes registrados.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 py-2 mb-1">
            <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} />
            <span className="text-xs text-warm-gray font-semibold">Seleccionar todos</span>
          </div>
          <div className="space-y-3">
            {paginated.map(c => {
              const key = clientKey(c);
              const isExpanded = expanded === key;
              const segment = getSegment(c);
              const lastOrder = c.orders[0];
              const lastProduct = lastOrder ? (lastOrder.items as any[])?.[0]?.productName || '—' : '—';
              return (
                <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between p-4 hover:bg-cream/30 transition-colors">
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <Checkbox checked={selected.has(key)} onCheckedChange={() => toggleSelect(key)} onClick={e => e.stopPropagation()} />
                       <div className="flex items-center gap-3 flex-wrap min-w-0 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : key)}>
                         <span className="font-semibold text-sm text-espresso">{c.name}</span>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${SEGMENT_STYLES[segment]}`}>{SEGMENT_LABELS[segment]}</span>
                         <span className="text-xs text-warm-gray">{c.email || 'Sin email'}</span>
                         <span className="text-xs px-2 py-0.5 rounded-full bg-cream text-warm-gray font-semibold">
                           {c.orders.length} {c.orders.length === 1 ? 'pedido' : 'pedidos'}
                         </span>
                         <span className="font-semibold text-sm text-espresso">{formatPrice(c.totalSpent)}</span>
                         <span className="text-[10px] text-warm-gray/70">Última compra: {formatDate(c.lastOrder)}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); handleDeleteClick(c); }} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar cliente">
                        <Trash2 size={15} />
                      </button>
                      <div className="cursor-pointer" onClick={() => setExpanded(isExpanded ? null : key)}>
                        {isExpanded ? <ChevronUp size={16} className="text-warm-gray" /> : <ChevronDown size={16} className="text-warm-gray" />}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                      {/* Order history table */}
                      <p className="text-xs text-warm-gray mb-2 font-semibold">Historial de pedidos</p>
                      <div className="overflow-x-auto mb-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-warm-gray border-b">
                              <th className="text-left py-1 pr-3">Fecha</th>
                              <th className="text-left py-1 pr-3">Producto</th>
                              <th className="text-right py-1 pr-3">Monto</th>
                              <th className="text-left py-1">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.orders.map((o: any) => (
                              <tr key={o.id} className="border-b border-gray-50">
                                <td className="py-1.5 pr-3 text-xs text-warm-gray">{formatDate(o.created_at)}</td>
                                <td className="py-1.5 pr-3 text-xs text-espresso truncate max-w-[200px]">
                                  {(o.items as any[])?.map((i: any) => i.productName).join(', ')}
                                </td>
                                <td className="py-1.5 pr-3 text-xs text-espresso font-semibold text-right">{formatPrice(o.total)}</td>
                                <td className="py-1.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                    o.status === 'completed' || o.status === 'picked_up' ? 'bg-green-100 text-green-800' :
                                    o.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    o.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>{STATUS_LABELS[o.status] || o.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-xs text-warm-gray space-y-1 mb-3">
                        <p>Último pedido: {lastProduct} el {formatDate(c.lastOrder)} ({formatPrice(lastOrder?.total || 0)})</p>
                        <p>{getFrequency(c)}</p>
                        <p>Total gastado: <strong className="text-espresso">{formatPrice(c.totalSpent)}</strong></p>
                      </div>
                      <button onClick={() => setWhatsappModal({ clients: [{ name: c.name, phone: c.phone, email: c.email, lastProduct }] })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-warm-gray hover:bg-cream/50 transition-colors">
                        <MessageCircle size={13} className="text-green-600" /> Enviar mensaje WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => { setPage(i); setSelected(new Set()); }} className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${page === i ? 'bg-dusty-pink text-white' : 'text-warm-gray hover:bg-blush'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating group action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#3C2A1A] text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-semibold">{selected.size} {selected.size === 1 ? 'cliente seleccionado' : 'clientes seleccionados'}</span>
          <button onClick={() => { setGroupModal(true); setGroupMessage(''); setGroupTemplate('custom'); }}
            className="px-4 py-1.5 rounded-full bg-white/20 text-sm font-semibold hover:bg-white/30 transition-colors flex items-center gap-1.5">
            <MessageCircle size={14} /> Enviar mensaje grupal
          </button>
        </div>
      )}

      {/* Group message modal */}
      {groupModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 animate-fade-in" onClick={() => setGroupModal(false)}>
          <div className="bg-white w-full max-w-lg md:rounded-xl rounded-t-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-espresso mb-4">Enviar mensaje grupal</h3>
            <div className="mb-3">
              <label className="text-xs font-semibold text-warm-gray uppercase">Plantilla</label>
              <select value={groupTemplate} onChange={e => {
                setGroupTemplate(e.target.value);
                const tpl = MSG_TEMPLATES.find(t => t.value === e.target.value);
                if (tpl?.text) setGroupMessage(tpl.text);
                else if (e.target.value === 'custom') setGroupMessage('');
              }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1">
                {MSG_TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <textarea value={groupMessage} onChange={e => setGroupMessage(e.target.value)} rows={4} placeholder="Escribí tu mensaje..." className="w-full rounded-lg border border-gray-200 p-3 text-sm resize-none mb-3" />
            <div className="mb-3">
              <p className="text-xs font-semibold text-warm-gray mb-1">Destinatarios ({selectedClients.length}):</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedClients.map(c => (
                  <div key={c.email} className="flex items-center justify-between text-xs">
                    <span className="text-espresso">{c.name} — {c.phone}</span>
                    <button onClick={() => toggleSelect(c.email || c.name)} className="text-red-400 hover:text-red-600">✕</button>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-warm-gray mb-4">⚠️ Cada mensaje se abre como conversación individual en WhatsApp. Vos decidís si lo enviás.</p>
            <div className="flex gap-3">
              <button onClick={() => setGroupModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-warm-gray hover:bg-gray-50">Cancelar</button>
              <button onClick={handleGroupSend} disabled={!groupMessage.trim()} className="flex-1 px-4 py-2.5 rounded-lg bg-[#8B6F4E] text-white text-sm font-semibold hover:bg-[#7A5F3E] disabled:opacity-50">
                Abrir WhatsApp para {selectedClients.length} {selectedClients.length === 1 ? 'cliente' : 'clientes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp modal for individual client */}
      {whatsappModal && (
        <ActionConfirmModal open={true} onClose={() => setWhatsappModal(null)} variant="whatsapp" data={whatsappModal} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget && deleteTarget.keys.length === 1 ? '¿Eliminar este cliente?' : `¿Eliminar ${deleteTarget?.keys.length} clientes?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.keys.length === 1
                ? `Se eliminará permanentemente a "${deleteTarget.names[0]}" y todos sus pedidos y mensajes asociados. Esta acción no se puede deshacer.`
                : `Se eliminarán permanentemente ${deleteTarget?.keys.length} clientes y todos sus pedidos y mensajes asociados. Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              {deleteCustomers.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
