import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Pencil, Check, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Category } from '@/hooks/useCategories';

interface Props {
  categories: Category[];
  productCountByCategory: Record<string, number>;
  onClose: () => void;
}

export default function CategoryManagerModal({ categories, productCountByCategory, onClose }: Props) {
  const qc = useQueryClient();
  const [newLabel, setNewLabel] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const autoSlug = (label: string) => label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const handleLabelChange = (val: string) => {
    setNewLabel(val);
    setNewSlug(autoSlug(val));
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : -1;
      const { error } = await supabase.from('categories').insert({
        label: newLabel.trim(),
        value: newSlug.trim(),
        sort_order: maxOrder + 1,
        visible: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Categoría agregada');
      qc.invalidateQueries({ queryKey: ['categories'] });
      setNewLabel('');
      setNewSlug('');
    },
    onError: (err: any) => toast.error(`Error: ${err.message}`),
  });

  const updateLabelMutation = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await supabase.from('categories').update({ label }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nombre actualizado');
      qc.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
    },
    onError: (err: any) => toast.error(`Error: ${err.message}`),
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase.from('categories').update({ visible }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: any) => toast.error(`Error: ${err.message}`),
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: { id: string; sort_order: number }[]) => {
      for (const item of reordered) {
        const { error } = await supabase.from('categories').update({ sort_order: item.sort_order }).eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: any) => toast.error(`Error: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Categoría eliminada');
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: any) => toast.error(`Error: ${err.message}`),
  });

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const reordered = categories.map((c, i) => {
      if (i === index) return { id: c.id, sort_order: categories[swapIdx].sort_order };
      if (i === swapIdx) return { id: c.id, sort_order: categories[index].sort_order };
      return { id: c.id, sort_order: c.sort_order };
    });
    reorderMutation.mutate(reordered);
  };

  const handleDelete = (cat: Category) => {
    const count = productCountByCategory[cat.value] || 0;
    if (count > 0) {
      toast.error(`No se puede eliminar "${cat.label}" porque tiene ${count} producto(s) asignado(s).`);
      return;
    }
    deleteMutation.mutate(cat.id);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditLabel(cat.label);
  };

  const submitEdit = (id: string) => {
    if (!editLabel.trim()) return;
    updateLabelMutation.mutate({ id, label: editLabel.trim() });
  };

  const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl font-bold text-espresso">Gestionar Categorías</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-blush transition-colors text-warm-gray hover:text-espresso">
            <X size={18} />
          </button>
        </div>

        {/* Category list */}
        <div className="space-y-2 mb-6">
          {categories.map((cat, i) => (
            <div key={cat.id} className="flex items-center gap-2 p-3 rounded-lg bg-cream/50 border border-gray-100">
              {/* Reorder */}
              <div className="flex flex-col">
                <button onClick={() => moveCategory(i, 'up')} disabled={i === 0} className="p-0.5 text-warm-gray hover:text-espresso disabled:opacity-30 transition-colors">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => moveCategory(i, 'down')} disabled={i === categories.length - 1} className="p-0.5 text-warm-gray hover:text-espresso disabled:opacity-30 transition-colors">
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Label (editable) */}
              <div className="flex-1 min-w-0">
                {editingId === cat.id ? (
                  <div className="flex items-center gap-1">
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitEdit(cat.id)} className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30" autoFocus />
                    <button onClick={() => submitEdit(cat.id)} className="p-1 text-sage hover:text-espresso"><Check size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-warm-gray hover:text-espresso"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-espresso truncate">{cat.label}</span>
                    <span className="text-xs text-warm-gray">({cat.value})</span>
                    <button onClick={() => startEdit(cat)} className="p-0.5 text-warm-gray hover:text-espresso transition-colors"><Pencil size={12} /></button>
                  </div>
                )}
              </div>

              {/* Product count */}
              <span className="text-xs text-warm-gray whitespace-nowrap">{productCountByCategory[cat.value] || 0} prod.</span>

              {/* Visibility toggle */}
              <button
                onClick={() => toggleVisibility.mutate({ id: cat.id, visible: !cat.visible })}
                className={`w-10 h-5 rounded-full transition-colors ${cat.visible ? 'bg-sage' : 'bg-gray-200'} relative flex-shrink-0`}
                title={cat.visible ? 'Visible en catálogo' : 'Oculta en catálogo'}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${cat.visible ? 'left-5' : 'left-0.5'}`} />
              </button>

              {/* Delete */}
              <button onClick={() => handleDelete(cat)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-warm-gray hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-warm-gray text-center py-4">No hay categorías</p>
          )}
        </div>

        {/* Add new */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-warm-gray uppercase tracking-wider mb-3">Agregar categoría</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <input placeholder="Nombre" value={newLabel} onChange={e => handleLabelChange(e.target.value)} className={inputClass} />
            </div>
            <div className="w-36">
              <input placeholder="Slug" value={newSlug} onChange={e => setNewSlug(e.target.value)} className={inputClass} />
            </div>
            <button
              onClick={() => addMutation.mutate()}
              disabled={!newLabel.trim() || !newSlug.trim() || addMutation.isPending}
              className="flex items-center gap-1 rounded-full bg-dusty-pink text-white px-4 py-2 text-sm font-semibold hover:bg-mauve transition-all active:scale-95 disabled:opacity-50"
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
