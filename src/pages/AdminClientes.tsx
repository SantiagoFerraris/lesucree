import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, ChevronDown, ChevronUp, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatPrice';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_SIZE = 10;

export default function AdminClientes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ keys: string[]; emails: string[]; names: string[] } | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-customers-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // FIX Bug 3: totalSpent sums ALL orders (not just completed)
  const customers = useMemo(() => {
    if (!orders) return [];
    const map: Record<string, { name: string; email: string; phone: string; orders: any[]; totalSpent: number; lastOrder: string; firstOrder: string }> = {};
    orders.forEach(o => {
      const key = o.customer_email || o.customer_name;
      if (!map[key]) {
        map[key] = { name: o.customer_name, email: o.customer_email, phone: o.customer_phone, orders: [], totalSpent: 0, lastOrder: o.created_at, firstOrder: o.created_at };
      }
      map[key].orders.push(o);
      // Sum all non-cancelled orders
      if (o.status !== 'cancelled') map[key].totalSpent += Number(o.total);
      if (o.created_at > map[key].lastOrder) map[key].lastOrder = o.created_at;
      if (o.created_at < map[key].firstOrder) map[key].firstOrder = o.created_at;
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter(c => c.orders.length > 1).length;
  const newThisMonth = customers.filter(c => c.firstOrder >= monthStart).length;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (d: string) => {
    if (!d) return '—';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const STATUS_LABELS: Record<string, string> = { pending: 'Pendiente', confirmed: 'Confirmado', completed: 'Completado', cancelled: 'Cancelado' };

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Nombre', 'Email', 'Teléfono', 'Total Pedidos', 'Total Gastado', 'Último Pedido'];
    const rows = filtered.map(c => [c.name, c.email, c.phone, c.orders.length, c.totalSpent, formatDate(c.lastOrder)]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteCustomers = useMutation({
    mutationFn: async (emails: string[]) => {
      for (const email of emails) {
        const { error: ordErr } = await supabase.from('orders').delete().eq('customer_email', email);
        if (ordErr) throw ordErr;
        const { error: msgErr } = await supabase.from('contact_messages').delete().eq('email', email);
        if (msgErr) throw msgErr;
      }
    },
    onSuccess: () => {
      toast.success('Cliente(s) eliminado(s) correctamente');
      setSelected(new Set()); setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['admin-customers-orders'] });
    },
    onError: () => { toast.error('Error al eliminar. Intentá de nuevo.'); },
  });

  const handleDeleteClick = (customer: typeof customers[0]) => {
    const key = customer.email || customer.name;
    setDeleteTarget({ keys: [key], emails: [customer.email], names: [customer.name] });
  };
  const handleBulkDelete = () => {
    const targets = filtered.filter(c => selected.has(c.email || c.name));
    setDeleteTarget({ keys: targets.map(c => c.email || c.name), emails: targets.map(c => c.email), names: targets.map(c => c.name) });
  };
  const confirmDelete = () => { if (deleteTarget) deleteCustomers.mutate(deleteTarget.emails); };
  const toggleSelect = (key: string) => { setSelected(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }); };
  const toggleSelectAll = () => { if (selected.size === paginated.length) setSelected(new Set()); else setSelected(new Set(paginated.map(c => c.email || c.name))); };
  const allPageSelected = paginated.length > 0 && paginated.every(c => selected.has(c.email || c.name));

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-espresso mb-6">Clientes</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-espresso font-display">{isLoading ? '—' : totalCustomers}</p>
          <p className="text-xs text-warm-gray">{totalCustomers === 1 ? 'Cliente total' : 'Clientes totales'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-espresso font-display">{isLoading ? '—' : repeatCustomers}</p>
          <p className="text-xs text-warm-gray">{repeatCustomers === 1 ? 'Recurrente' : 'Recurrentes'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-espresso font-display">{isLoading ? '—' : newThisMonth}</p>
          <p className="text-xs text-warm-gray">{newThisMonth === 1 ? 'Nuevo este mes' : 'Nuevos este mes'}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
          <input placeholder="Buscar por nombre o email..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); setSelected(new Set()); }}
            className="w-full sm:w-80 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30" />
        </div>
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
              const key = c.email || c.name;
              const isExpanded = expanded === key;
              return (
                <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between p-4 hover:bg-cream/30 transition-colors">
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <Checkbox checked={selected.has(key)} onCheckedChange={() => toggleSelect(key)} onClick={e => e.stopPropagation()} />
                      <div className="flex items-center gap-4 flex-wrap min-w-0 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : key)}>
                        <span className="font-semibold text-sm text-espresso">{c.name}</span>
                        <span className="text-xs text-warm-gray">{c.email}</span>
                        <span className="text-xs text-warm-gray">{c.phone}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cream text-warm-gray font-semibold">
                          {c.orders.length} {c.orders.length === 1 ? 'pedido' : 'pedidos'}
                        </span>
                        <span className="font-semibold text-sm text-espresso">{formatPrice(c.totalSpent)}</span>
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
                      <p className="text-xs text-warm-gray mb-2">Historial de pedidos</p>
                      <div className="space-y-2">
                        {c.orders.map((o: any) => (
                          <div key={o.id} className="flex items-center justify-between text-sm bg-cream/30 rounded-lg p-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-mono text-warm-gray">#{o.id.slice(0, 8).toUpperCase()}</span>
                              <span className="text-xs text-warm-gray">{formatDate(o.created_at)}</span>
                              <span className="text-xs text-warm-gray truncate max-w-[200px]">
                                {(o.items as any[])?.map((i: any) => i.productName).join(', ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-espresso">{formatPrice(o.total)}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                o.status === 'completed' ? 'bg-green-100 text-green-800' :
                                o.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                o.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>{STATUS_LABELS[o.status] || o.status}</span>
                            </div>
                          </div>
                        ))}
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
                <button key={i} onClick={() => { setPage(i); setSelected(new Set()); }} className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${page === i ? 'bg-dusty-pink text-white' : 'text-warm-gray hover:bg-blush'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </>
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
