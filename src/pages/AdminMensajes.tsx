import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function AdminMensajes() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

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
    },
  });

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-espresso mb-6">Mensajes</h2>

      {isLoading ? (
        <p className="text-warm-gray">Cargando...</p>
      ) : messages?.length === 0 ? (
        <p className="text-warm-gray">No hay mensajes aún.</p>
      ) : (
        <div className="space-y-3">
          {messages?.map(m => (
            <div
              key={m.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setExpanded(expanded === m.id ? null : m.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-espresso text-sm">{m.name}</span>
                    <span className="text-xs text-warm-gray">{m.email}</span>
                  </div>
                  <p className="text-sm text-warm-gray mt-1 truncate">
                    {expanded === m.id ? m.message : m.message.slice(0, 100) + (m.message.length > 100 ? '...' : '')}
                  </p>
                  {expanded === m.id && m.message.length > 100 && (
                    <p className="text-sm text-espresso mt-2 whitespace-pre-wrap">{m.message}</p>
                  )}
                  <span className="text-xs text-warm-gray/60 mt-2 block">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString('es-AR') : ''}
                  </span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteMutation.mutate(m.id); }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-warm-gray hover:text-red-500 transition-colors ml-3"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
