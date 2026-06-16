import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Power, Search, X, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatPrice';

type DiscountType = 'percentage' | 'fixed';

interface PromotionRow {
  id: string;
  title: string | null;
  internal_notes: string | null;
  discount_type: string;
  discount_value: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  banner_text: string | null;
  show_discount_badge: boolean;
  custom_badge_text: string | null;
  created_at: string;
}

interface PromoForm {
  title: string;
  internal_notes: string;
  discount_type: DiscountType;
  discount_value: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  show_discount_badge: boolean;
  custom_badge_text: string;
  banner_text: string;
  product_ids: string[];
}

const emptyForm: PromoForm = {
  title: '',
  internal_notes: '',
  discount_type: 'percentage',
  discount_value: '',
  start_date: '',
  end_date: '',
  is_active: true,
  show_discount_badge: true,
  custom_badge_text: '',
  banner_text: '',
  product_ids: [],
};

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30';

function computeStatus(p: PromotionRow): 'active' | 'scheduled' | 'expired' | 'disabled' {
  if (!p.is_active) return 'disabled';
  const now = new Date();
  const start = p.start_date ? new Date(p.start_date) : null;
  const end = p.end_date ? new Date(p.end_date) : null;
  if (end && end < now) return 'expired';
  if (start && start > now) return 'scheduled';
  return 'active';
}

const statusStyles: Record<string, string> = {
  active: 'bg-sage/20 text-sage-foreground text-emerald-700',
  scheduled: 'bg-blush text-espresso',
  expired: 'bg-gray-200 text-warm-gray',
  disabled: 'bg-gray-100 text-warm-gray',
};

const statusLabels: Record<string, string> = {
  active: 'Activa',
  scheduled: 'Programada',
  expired: 'Expirada',
  disabled: 'Desactivada',
};

function toLocalInput(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OfertasProgramadas() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PromotionRow | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  // Promotions
  const { data: promotions, isLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('promotions' as any) as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PromotionRow[];
    },
  });

  // Promotion-product links
  const { data: links } = useQuery({
    queryKey: ['admin-promotion-products'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('promotion_products' as any) as any).select('*');
      if (error) throw error;
      return (data || []) as { id: string; promotion_id: string; product_id: string }[];
    },
  });

  // Products
  const { data: products } = useQuery({
    queryKey: ['admin-promotions-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category, image_url, active')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as { id: string; name: string; price: number; category: string; image_url: string | null; active: boolean }[];
    },
  });

  const productsById = useMemo(() => {
    const m: Record<string, { id: string; name: string }> = {};
    (products || []).forEach(p => { m[p.id] = p; });
    return m;
  }, [products]);

  const productsByPromo = useMemo(() => {
    const m: Record<string, string[]> = {};
    (links || []).forEach(l => {
      if (!m[l.promotion_id]) m[l.promotion_id] = [];
      m[l.promotion_id].push(l.product_id);
    });
    return m;
  }, [links]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return (products || []).filter(p => !q || p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setProductSearch('');
    setShowForm(true);
  };

  const openEdit = (p: PromotionRow) => {
    setEditing(p);
    setForm({
      title: p.title || '',
      internal_notes: p.internal_notes || '',
      discount_type: (p.discount_type as DiscountType) || 'percentage',
      discount_value: p.discount_value != null ? String(p.discount_value) : '',
      start_date: toLocalInput(p.start_date),
      end_date: toLocalInput(p.end_date),
      is_active: p.is_active,
      show_discount_badge: (p as any).show_discount_badge !== false,
      custom_badge_text: (p as any).custom_badge_text || '',
      banner_text: p.banner_text || '',
      product_ids: productsByPromo[p.id] || [],
    });
    setProductSearch('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const toggleProduct = (id: string) => {
    setForm(p => ({
      ...p,
      product_ids: p.product_ids.includes(id) ? p.product_ids.filter(x => x !== id) : [...p.product_ids, id],
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validation
      if (!form.title.trim()) throw new Error('Ingresá un título para la promoción');
      const valueNum = Number(form.discount_value);
      if (!form.discount_value || isNaN(valueNum) || valueNum <= 0) throw new Error('Ingresá un valor de descuento válido');
      if (form.discount_type === 'percentage' && valueNum > 100) throw new Error('El porcentaje no puede superar 100');
      if (!form.start_date) throw new Error('Ingresá la fecha de inicio');
      if (!form.end_date) throw new Error('Ingresá la fecha de fin');
      if (new Date(form.end_date) < new Date(form.start_date)) throw new Error('La fecha de fin debe ser posterior al inicio');
      if (form.product_ids.length === 0) throw new Error('Seleccioná al menos un producto');

      const payload = {
        title: form.title.trim(),
        name: form.title.trim(), // legacy column
        internal_notes: form.internal_notes.trim() || null,
        discount_type: form.discount_type,
        discount_value: valueNum,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        is_active: form.is_active,
        show_discount_badge: form.show_discount_badge,
        banner_text: form.banner_text.trim() || null,
        status: 'active', // legacy column
      };

      let promotionId: string;

      if (editing) {
        const { error } = await (supabase.from('promotions' as any) as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        promotionId = editing.id;
        // Replace links
        await (supabase.from('promotion_products' as any) as any).delete().eq('promotion_id', promotionId);
      } else {
        const { data, error } = await (supabase.from('promotions' as any) as any).insert(payload).select('id').single();
        if (error) throw error;
        promotionId = (data as any).id;
      }

      if (form.product_ids.length > 0) {
        const rows = form.product_ids.map(pid => ({ promotion_id: promotionId, product_id: pid }));
        const { error: linkErr } = await (supabase.from('promotion_products' as any) as any).insert(rows);
        if (linkErr) throw linkErr;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Promoción actualizada' : 'Promoción creada');
      qc.invalidateQueries({ queryKey: ['admin-promotions'] });
      qc.invalidateQueries({ queryKey: ['admin-promotion-products'] });
      closeForm();
    },
    onError: (err: any) => toast.error(err?.message || 'Error al guardar'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await (supabase.from('promotions' as any) as any).update({ is_active: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-promotions'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('promotions' as any) as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Promoción eliminada');
      qc.invalidateQueries({ queryKey: ['admin-promotions'] });
      qc.invalidateQueries({ queryKey: ['admin-promotion-products'] });
      setDeleteConfirm(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Error al eliminar'),
  });

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDiscount = (p: PromotionRow) => {
    if (p.discount_value == null) return '—';
    return p.discount_type === 'percentage'
      ? `${p.discount_value}%`
      : formatPrice(Number(p.discount_value));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <p className="text-sm text-warm-gray">
          Gestioná manualmente las ofertas y descuentos aplicables a tus productos.
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-full bg-dusty-pink text-white px-5 py-2 text-sm font-semibold hover:bg-mauve transition-all active:scale-95"
        >
          <Plus size={16} /> Nueva promoción
        </button>
      </div>

      {isLoading ? (
        <p className="text-warm-gray">Cargando...</p>
      ) : !promotions || promotions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-cream flex items-center justify-center">
              <Tag size={24} className="text-dusty-pink" />
            </div>
            <h3 className="font-display text-lg font-bold text-espresso mb-2">Sin promociones todavía</h3>
            <p className="text-sm text-warm-gray">
              Creá tu primera oferta programada para comenzar a aplicar descuentos a productos seleccionados.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b text-left text-warm-gray">
                <th className="py-3 px-4">Promoción</th>
                <th className="py-3 px-4 hidden md:table-cell">Productos</th>
                <th className="py-3 px-4">Descuento</th>
                <th className="py-3 px-4 hidden lg:table-cell">Inicio</th>
                <th className="py-3 px-4 hidden lg:table-cell">Fin</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p, i) => {
                const status = computeStatus(p);
                const productIds = productsByPromo[p.id] || [];
                const productNames = productIds
                  .map(id => productsById[id]?.name)
                  .filter(Boolean) as string[];
                return (
                  <tr key={p.id} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-cream/50'}`}>
                    <td className="py-3 px-4 font-medium text-espresso">
                      <div>{p.title || '(sin título)'}</div>
                      {p.banner_text && (
                        <div className="text-xs text-warm-gray mt-0.5 truncate max-w-[220px]">
                          {p.banner_text}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-warm-gray">
                      {productNames.length === 0 ? (
                        <span className="text-xs italic">Sin productos</span>
                      ) : (
                        <span className="text-xs">
                          {productNames.slice(0, 2).join(', ')}
                          {productNames.length > 2 && ` +${productNames.length - 2}`}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-espresso font-semibold">{formatDiscount(p)}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-warm-gray text-xs">{formatDate(p.start_date)}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-warm-gray text-xs">{formatDate(p.end_date)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyles[status]}`}>
                        {statusLabels[status]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          title="Editar"
                          className="p-1.5 rounded-lg hover:bg-blush transition-colors text-warm-gray hover:text-espresso"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: p.id, value: !p.is_active })}
                          title={p.is_active ? 'Desactivar' : 'Activar'}
                          className={`p-1.5 rounded-lg hover:bg-cream transition-colors ${p.is_active ? 'text-sage' : 'text-warm-gray'}`}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-warm-gray hover:text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-espresso">¿Eliminar promoción?</h3>
            <p className="text-sm text-warm-gray mt-2">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-full border border-gray-200 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="flex-1 rounded-full bg-red-500 text-white py-2 text-sm font-semibold hover:bg-red-600 transition-colors active:scale-95"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-espresso">
                {editing ? 'Editar promoción' : 'Nueva promoción'}
              </h3>
              <button onClick={closeForm} className="p-1 text-warm-gray hover:text-espresso">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Título *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className={inputClass}
                  maxLength={120}
                  placeholder="Ej: Descuento de invierno"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Notas internas</label>
                <textarea
                  value={form.internal_notes}
                  onChange={e => setForm(p => ({ ...p, internal_notes: e.target.value }))}
                  className={`${inputClass} min-h-[60px] resize-none`}
                  maxLength={500}
                  placeholder="Solo visibles para el admin"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Tipo de descuento *</label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm(p => ({ ...p, discount_type: e.target.value as DiscountType }))}
                    className={inputClass}
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo (ARS)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">
                    Valor * {form.discount_type === 'percentage' ? '(%)' : '(ARS)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={form.discount_type === 'percentage' ? '1' : '100'}
                    value={form.discount_value}
                    onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Inicio *</label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Fin *</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Banner promocional</label>
                <input
                  value={form.banner_text}
                  onChange={e => setForm(p => ({ ...p, banner_text: e.target.value }))}
                  className={inputClass}
                  maxLength={140}
                  placeholder="Texto opcional para destacar en el sitio"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="promo-active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="promo-active" className="text-sm text-espresso">Promoción activa</label>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <input
                    id="promo-show-badge"
                    type="checkbox"
                    checked={form.show_discount_badge}
                    onChange={e => setForm(p => ({ ...p, show_discount_badge: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="promo-show-badge" className="text-sm text-espresso">
                    Mostrar badge visual en catálogo
                  </label>
                </div>
                <p className="text-xs text-warm-gray mt-1 ml-6">
                  Controla si esta promoción muestra el badge visual sobre la imagen del producto.
                </p>
              </div>

              {/* Product selector */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">
                    Productos incluidos * ({form.product_ids.length})
                  </label>
                </div>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
                  <input
                    placeholder="Buscar producto..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-warm-gray p-3">No se encontraron productos.</p>
                  ) : (
                    filteredProducts.map(p => {
                      const checked = form.product_ids.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-cream/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProduct(p.id)}
                            className="rounded"
                          />
                          <span className="flex-1 text-sm text-espresso flex items-center gap-2 flex-wrap">
                            {p.name}
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{p.category}</span>
                          </span>
                          <span className="text-xs text-warm-gray">{formatPrice(Number(p.price))}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 rounded-full bg-dusty-pink text-white py-2.5 text-sm font-semibold hover:bg-mauve transition-all active:scale-95 disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
