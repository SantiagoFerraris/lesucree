import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Search, CheckCircle, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function AdminMensajes() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const PAGE_SIZE = 10;

  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contact_messages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mensaje eliminado');
      qc.invalidateQueries({ queryKey: ['admin-messages'] });
      setDeleteConfirm(null);
    },
  });

  const toggleReadMutation = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      const { error } = await supabase.from('contact_messages').update({ read } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-messages'] });
    },
  });

  const filtered = messages?.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil((filtered?.length || 0) / PAGE_SIZE);
  const paginated = filtered?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-espresso mb-6">Mensajes</h2>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
        <input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="w-full sm:w-80 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
        />
      </div>

      {isLoading ? (
        <p className="text-warm-gray">Cargando...</p>
      ) : !paginated?.length ? (
        <p className="text-warm-gray">No hay mensajes todavía.</p>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(m => {
              const isRead = (m as any).read;
              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${isRead ? 'border-gray-100' : 'border-dusty-pink/30 bg-blush/10'}`}
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={e => { e.stopPropagation(); toggleReadMutation.mutate({ id: m.id, read: !isRead }); }}
                          className="text-warm-gray hover:text-dusty-pink transition-colors flex-shrink-0"
                          title={isRead ? 'Marcar como no leído' : 'Marcar como leído'}
                        >
                          {isRead ? <CheckCircle size={16} className="text-sage" /> : <Circle size={16} />}
                        </button>
                        <span className={`font-semibold text-sm ${isRead ? 'text-warm-gray' : 'text-espresso'}`}>{m.name}</span>
                        <span className="text-xs text-warm-gray">{m.email}</span>
                      </div>
                      <p className="text-sm text-warm-gray mt-1 truncate ml-7">
                        {expanded === m.id ? '' : m.message.slice(0, 100) + (m.message.length > 100 ? '...' : '')}
                      </p>
                      {expanded === m.id && (
                        <p className="text-sm text-espresso mt-2 whitespace-pre-wrap ml-7">{m.message}</p>
                      )}
                      <span className="text-xs text-warm-gray/60 mt-2 block ml-7">
                        {formatDate(m.created_at)}
                      </span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(m.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-warm-gray hover:text-red-500 transition-colors ml-3"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${page === i ? 'bg-dusty-pink text-white' : 'text-warm-gray hover:bg-blush'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-espresso">¿Eliminar mensaje?</h3>
            <p className="text-sm text-warm-gray mt-2">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-full border border-gray-200 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors active:scale-95">
                Cancelar
              </button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm)} className="flex-1 rounded-full bg-red-500 text-white py-2 text-sm font-semibold hover:bg-red-600 transition-colors active:scale-95">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
