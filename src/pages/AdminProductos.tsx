import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, X, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatPrice';
import { CATEGORY_LABELS, CATEGORIES } from '@/lib/constants';
import type { Tables } from '@/integrations/supabase/types';

interface VariantForm { id?: string; label: string; price: string; sort_order: number; }
interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  featured: boolean;
  image_url: string;
  variants: VariantForm[];
}

const emptyForm: ProductFormData = { name: '', description: '', price: '', category: 'tortas', featured: false, image_url: '', variants: [] };
const PAGE_SIZE = 10;

export default function AdminProductos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Tables<'products'> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allVariants } = useQuery({
    queryKey: ['admin-variants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_variants').select('*').order('sort_order');
      if (error) throw error;
      return data as any[];
    },
  });

  const getVariants = (pid: string) => allVariants?.filter((v: any) => v.product_id === pid) || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const hasVariants = form.variants.length > 0;
      const minVariantPrice = hasVariants ? Math.min(...form.variants.map(v => parseFloat(v.price))) : parseFloat(form.price);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: hasVariants ? minVariantPrice : parseFloat(form.price),
        category: form.category,
        featured: form.featured,
        image_url: form.image_url || null,
      };

      let productId: string;
      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
        if (error) throw error;
        productId = editing.id;
        // Delete old variants and re-insert
        await supabase.from('product_variants').delete().eq('product_id', productId);
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select('id').single();
        if (error) throw error;
        productId = data.id;
      }

      // Insert variants
      if (form.variants.length > 0) {
        const variantRows = form.variants.map((v, i) => ({
          product_id: productId,
          label: v.label.trim(),
          price: parseFloat(v.price),
          sort_order: v.sort_order ?? i,
        }));
        const { error } = await supabase.from('product_variants').insert(variantRows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-variants'] });
      closeForm();
    },
    onError: (err: any) => { console.error('Save mutation error:', err); toast.error(`Error al guardar: ${err?.message || 'Error desconocido'}`); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Producto eliminado');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteConfirm(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'featured' | 'active'; value: boolean }) => {
      const { error } = await supabase.from('products').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.field === 'featured' ? 'Destacado' : 'Estado'} actualizado`);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Solo JPG, PNG o WebP'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) { console.error('Image upload error:', error); toast.error(`Error al subir imagen: ${error.message}`); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    setForm(p => ({ ...p, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const openEdit = (p: Tables<'products'>) => {
    const existingVariants = getVariants(p.id).map((v: any) => ({
      id: v.id,
      label: v.label,
      price: String(v.price),
      sort_order: v.sort_order,
    }));
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      category: p.category,
      featured: p.featured ?? false,
      image_url: p.image_url || '',
      variants: existingVariants,
    });
    setShowForm(true);
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Completá el nombre'); return; }
    if (form.variants.length === 0 && !form.price) { toast.error('Completá el precio'); return; }
    if (form.variants.some(v => !v.label.trim() || !v.price)) { toast.error('Completá todas las variantes'); return; }
    saveMutation.mutate();
  };

  const addVariant = () => {
    setForm(p => ({ ...p, variants: [...p.variants, { label: '', price: '', sort_order: p.variants.length }] }));
  };
  const removeVariant = (idx: number) => {
    setForm(p => ({ ...p, variants: p.variants.filter((_, i) => i !== idx) }));
  };
  const updateVariant = (idx: number, field: keyof VariantForm, value: string | number) => {
    setForm(p => ({
      ...p,
      variants: p.variants.map((v, i) => i === idx ? { ...v, [field]: value } : v),
    }));
  };

  const filtered = products?.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil((filtered?.length || 0) / PAGE_SIZE);
  const paginated = filtered?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30';

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="font-display text-2xl font-bold text-espresso">Productos</h2>
        <div className="flex items-center gap-3">
          <button onClick={async () => {
            setSyncing(true);
            try {
              const { data, error } = await supabase.functions.invoke('sync-prices-from-sheet');
              if (error) { toast.error(`Error al sincronizar precios: ${error?.message || 'Error desconocido'}`); }
              else { toast.success(`Precios sincronizados: ${data.updated} productos actualizados`); qc.invalidateQueries({ queryKey: ['admin-products'] }); }
            } catch (err: any) { toast.error(`Error al sincronizar precios: ${err?.message || 'Error desconocido'}`); }
            finally { setSyncing(false); }
          }} disabled={syncing} className="flex items-center gap-2 rounded-full border border-espresso text-espresso px-4 py-2 text-sm font-semibold hover:bg-espresso/10 transition-colors disabled:opacity-50">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> Sincronizar precios
          </button>
          <button onClick={openNew} className="flex items-center gap-2 rounded-full bg-dusty-pink text-white px-5 py-2 text-sm font-semibold hover:bg-mauve transition-all active:scale-95">
            <Plus size={16} /> Agregar Producto
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
        <input placeholder="Buscar productos..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="w-full sm:w-80 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30" />
      </div>
      {(() => {
        const lastSync = products?.reduce((latest, p) => {
          const sync = (p as any).last_price_sync;
          if (!sync) return latest;
          return !latest || new Date(sync) > new Date(latest) ? sync : latest;
        }, null as string | null);
        return lastSync ? (
          <p className="text-xs text-warm-gray mb-4">Última sincronización: {new Date(lastSync).toLocaleString('es-AR')}</p>
        ) : null;
      })()}

      {isLoading ? (
        <p className="text-warm-gray">Cargando...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-warm-gray">
                  <th className="py-3 pr-4">Imagen</th>
                  <th className="py-3 pr-4">Nombre</th>
                  <th className="py-3 pr-4 hidden md:table-cell">Categoría</th>
                  <th className="py-3 pr-4">Precio</th>
                  <th className="py-3 pr-4 hidden sm:table-cell">Destacado</th>
                  <th className="py-3 pr-4 hidden sm:table-cell">Activo</th>
                  <th className="py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated?.map((p, i) => {
                  const vars = getVariants(p.id);
                  return (
                    <tr key={p.id} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-cream/50'}`}>
                      <td className="py-3 pr-4">
                        <img src={p.image_url || 'https://images.unsplash.com/photo-1486427944544-d2c246c4df4f?w=48&h=48&fit=crop'} alt="" className="w-12 h-12 rounded-lg object-cover" loading="lazy" />
                      </td>
                      <td className="py-3 pr-4 font-medium text-espresso">
                        {p.name}
                        {vars.length > 0 && <span className="text-xs text-warm-gray block">{vars.length} variantes</span>}
                      </td>
                      <td className="py-3 pr-4 hidden md:table-cell text-warm-gray">{CATEGORY_LABELS[p.category]}</td>
                      <td className="py-3 pr-4 text-espresso">
                        {vars.length > 0 ? `Desde ${formatPrice(p.price)}` : formatPrice(p.price)}
                      </td>
                      <td className="py-3 pr-4 hidden sm:table-cell">
                        <button onClick={() => toggleMutation.mutate({ id: p.id, field: 'featured', value: !p.featured })} className={`w-10 h-5 rounded-full transition-colors ${p.featured ? 'bg-dusty-pink' : 'bg-gray-200'} relative`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.featured ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="py-3 pr-4 hidden sm:table-cell">
                        <button onClick={() => toggleMutation.mutate({ id: p.id, field: 'active', value: !p.active })} className={`w-10 h-5 rounded-full transition-colors ${p.active ? 'bg-sage' : 'bg-gray-200'} relative`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.active ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blush transition-colors text-warm-gray hover:text-espresso"><Pencil size={15} /></button>
                          <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-warm-gray hover:text-red-500"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${page === i ? 'bg-dusty-pink text-white' : 'text-warm-gray hover:bg-blush'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-espresso">¿Estás seguro?</h3>
            <p className="text-sm text-warm-gray mt-2">¿Querés eliminar este producto?</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-full border border-gray-200 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors active:scale-95">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm)} className="flex-1 rounded-full bg-red-500 text-white py-2 text-sm font-semibold hover:bg-red-600 transition-colors active:scale-95">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-xl font-bold text-espresso">{editing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Nombre *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} maxLength={200} />
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={`${inputClass} min-h-[80px] resize-none`} maxLength={1000} />
              </div>
              {form.variants.length === 0 && (
                <div>
                  <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Precio (ARS) *</label>
                  <input type="number" min="0" step="1" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className={inputClass} />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Categoría *</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputClass}>
                  {CATEGORIES.filter(c => c.value !== 'todos').map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Imagen</label>
                {form.image_url && <img src={form.image_url} alt="Preview" className="w-24 h-24 rounded-lg object-cover mt-2 mb-2" />}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="text-sm" disabled={uploading} />
                {uploading && <p className="text-xs text-warm-gray mt-1">Subiendo...</p>}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="featured" checked={form.featured} onChange={e => setForm(p => ({ ...p, featured: e.target.checked }))} className="rounded" />
                <label htmlFor="featured" className="text-sm text-espresso">Destacado en inicio</label>
              </div>

              {/* Variants section */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Variantes de tamaño/precio</label>
                  <button type="button" onClick={addVariant} className="text-xs text-dusty-pink hover:text-mauve font-semibold flex items-center gap-1">
                    <Plus size={14} /> Agregar variante
                  </button>
                </div>
                {form.variants.length > 0 && (
                  <div className="space-y-2">
                    {form.variants.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          placeholder="Ej: Chica (6-8 porc.)"
                          value={v.label}
                          onChange={e => updateVariant(i, 'label', e.target.value)}
                          className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
                        />
                        <input
                          type="number"
                          placeholder="Precio"
                          min="0"
                          value={v.price}
                          onChange={e => updateVariant(i, 'price', e.target.value)}
                          className="w-28 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
                        />
                        <button type="button" onClick={() => removeVariant(i)} className="p-1 text-warm-gray hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-warm-gray">El precio del producto se calculará automáticamente como el mínimo de las variantes.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={closeForm} className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors active:scale-95">Cancelar</button>
                <button type="submit" disabled={saveMutation.isPending} className="flex-1 rounded-full bg-dusty-pink text-white py-2.5 text-sm font-semibold hover:bg-mauve transition-all active:scale-95 disabled:opacity-60">
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
