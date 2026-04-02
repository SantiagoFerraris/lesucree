import { useState } from 'react';
import { X, Copy, Archive } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PromoDraftsModal({ open, onClose }: Props) {
  const qc = useQueryClient();

  const { data: promos, isLoading } = useQuery({
    queryKey: ['promo-drafts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('status', 'draft')
        .order('created_at', { ascending: false }) as any;
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').update({ status: 'archived' } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Promo archivada');
      qc.invalidateQueries({ queryKey: ['promo-drafts'] });
    },
  });

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text || '');
    toast.success('Texto copiado');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl md:rounded-xl rounded-t-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-espresso">📋 Borradores de promos</h3>
          <button onClick={onClose} className="text-warm-gray hover:text-espresso"><X size={18} /></button>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />)}</div>
        ) : !promos?.length ? (
          <p className="text-sm text-warm-gray text-center py-8">No hay borradores de promos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-warm-gray uppercase border-b">
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-left py-2">Día</th>
                  <th className="text-left py-2">Tipo</th>
                  <th className="text-left py-2">Creado</th>
                  <th className="text-right py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 text-espresso font-medium">{p.name}</td>
                    <td className="py-2 text-warm-gray">{DAY_NAMES[p.day_of_week]}</td>
                    <td className="py-2 text-warm-gray">{p.discount_type === 'percentage' ? `${p.discount_value}%` : p.discount_type}</td>
                    <td className="py-2 text-warm-gray text-xs">{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="py-2 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => copyText(p.description)} className="p-1.5 rounded hover:bg-cream" title="Copiar texto">
                          <Copy size={13} className="text-warm-gray" />
                        </button>
                        <button onClick={() => archiveMutation.mutate(p.id)} className="p-1.5 rounded hover:bg-amber-50" title="Archivar">
                          <Archive size={13} className="text-amber-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
