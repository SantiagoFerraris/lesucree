import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
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
const PAGE_SIZE = 10;

export default function AdminPedidos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) { console.error('AdminPedidos error:', error); throw error; }
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status } as any).eq('id', id);
      if (error) { console.error('AdminPedidos error:', error); throw error; }
    },
    onSuccess: () => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  const filtered = orders?.filter(o => {
    const matchSearch = o.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil((filtered?.length || 0) / PAGE_SIZE);
  const paginated = filtered?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-espresso mb-6">Pedidos</h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
          <option value="pending">Pendiente</option>
          <option value="confirmed">Confirmado</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-warm-gray">Cargando...</p>
      ) : !paginated?.length ? (
        <p className="text-warm-gray">No hay pedidos.</p>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(o => (
              <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-cream/30 transition-colors"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-xs font-mono text-warm-gray">#{o.id.slice(0, 8).toUpperCase()}</span>
                    <span className="font-semibold text-sm text-espresso">{o.customer_name}</span>
                    <span className="text-xs text-warm-gray">{formatDate(o.created_at)}</span>
                    <span className="text-xs text-warm-gray">Retiro: {formatDate(o.desired_date)}</span>
                    <span className="font-semibold text-sm text-espresso">{formatPrice(o.total)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status] || ''}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </div>
                  {expanded === o.id ? <ChevronUp size={16} className="text-warm-gray" /> : <ChevronDown size={16} className="text-warm-gray" />}
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
                    <div className="flex items-center gap-3 pt-2">
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
                  </div>
                )}
              </div>
            ))}
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
