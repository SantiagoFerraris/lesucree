import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Ban, Mail, Phone, MessageSquare, BadgeCheck, Search, Tag, Copy, Send, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'disabled';
type DiscountType = 'percentage' | 'fixed';

interface ZumbitaRequest {
  id: string;
  customer_name: string;
  email: string | null;
  whatsapp: string | null;
  message: string | null;
  is_zumbita_student: boolean;
  verified_alumna: boolean;
  status: string;
  created_at: string;
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
  active: boolean;
}

interface CouponForm {
  code: string;
  discount_type: DiscountType;
  discount_value: string;
  expiration_date: string;
  max_uses: string;
  minimum_purchase_amount: string;
  single_use: boolean;
  product_ids: string[];
}

const statusStyles: Record<string, string> = {
  pending: 'bg-blush text-espresso',
  approved: 'bg-sage/20 text-emerald-700',
  rejected: 'bg-gray-200 text-warm-gray',
  disabled: 'bg-gray-100 text-warm-gray',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  disabled: 'Deshabilitada',
};

const filterOptions: { key: 'all' | RequestStatus; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'rejected', label: 'Rechazadas' },
  { key: 'disabled', label: 'Deshabilitadas' },
];

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30';

function suggestCode(name: string) {
  const slug = (name || 'ZUM')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 6) || 'ZUM';
  return `ZUMBITA-${slug}`;
}

function randomSuffix(len = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function appendRandomToCode(current: string) {
  const base = (current || '').trim().toUpperCase().replace(/-+$/, '');
  const suffix = randomSuffix(4);
  if (!base) return `PROMO-${suffix}`;
  return `${base}-${suffix}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function defaultExpiration() {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

const CHECKOUT_URL = 'https://lesucreepasteleria.com.ar/pedido';

function formatExpirationLong(value: string | null) {
  if (!value) return 'Sin vencimiento';
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function buildWhatsAppMessage(customerName: string, code: string, expirationDate: string | null) {
  const name = (customerName || '').trim();
  return `Hola ${name} ✨\n\nTu beneficio exclusivo para alumnas de Zumbita ya está listo 💕\n\nCódigo: ${code}\n\nPodés aplicarlo directamente al finalizar tu pedido en: ${CHECKOUT_URL}\n\nVálido hasta: ${formatExpirationLong(expirationDate)}\n\n¡Gracias por elegir Le Sucrée Pastelería! ✨`;
}

interface GeneratedCoupon {
  req: ZumbitaRequest;
  code: string;
  expirationDate: string | null;
}

export default function SolicitudesZumbita() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | RequestStatus>('all');
  const [search, setSearch] = useState('');
  const [couponModal, setCouponModal] = useState<ZumbitaRequest | null>(null);
  const [disableModal, setDisableModal] = useState<ZumbitaRequest | null>(null);
  const [generatedCoupon, setGeneratedCoupon] = useState<GeneratedCoupon | null>(null);
  const [form, setForm] = useState<CouponForm>({
    code: '',
    discount_type: 'percentage',
    discount_value: '10',
    expiration_date: defaultExpiration(),
    max_uses: '1',
    minimum_purchase_amount: '0',
    single_use: true,
    product_ids: [],
  });
  const [productSearch, setProductSearch] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['zumbita-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zumbita_discount_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ZumbitaRequest[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products-for-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, active')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as ProductRow[];
    },
    enabled: !!couponModal,
  });

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const s = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
  }, [products, productSearch]);


  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RequestStatus }) => {
      const { error } = await supabase
        .from('zumbita_discount_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zumbita-requests'] }),
    onError: (e: any) => toast.error(e.message || 'No se pudo actualizar'),
  });

  const toggleVerifiedAlumna = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await (supabase
        .from('zumbita_discount_requests') as any)
        .update({ verified_alumna: verified })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.verified ? 'Alumna verificada' : 'Verificación quitada');
      qc.invalidateQueries({ queryKey: ['zumbita-requests'] });
    },
    onError: (e: any) => toast.error(e.message || 'No se pudo actualizar la verificación'),
  });

  const disableBenefit = useMutation({
    mutationFn: async (req: ZumbitaRequest) => {
      const { error: couponErr } = await supabase
        .from('coupons')
        .update({ is_active: false })
        .eq('zumbita_request_id', req.id);
      if (couponErr) throw couponErr;

      const { error: reqErr } = await supabase
        .from('zumbita_discount_requests')
        .update({ status: 'disabled' })
        .eq('id', req.id);
      if (reqErr) throw reqErr;
    },
    onSuccess: () => {
      toast.success('Beneficio deshabilitado');
      qc.invalidateQueries({ queryKey: ['zumbita-requests'] });
      setDisableModal(null);
    },
    onError: (e: any) => toast.error(e.message || 'No se pudo deshabilitar el beneficio'),
  });

  const createCoupon = useMutation({
    mutationFn: async ({ req, form }: { req: ZumbitaRequest; form: CouponForm }) => {
      const code = form.code.trim().toUpperCase();
      if (!code) throw new Error('Ingresá un código de cupón');
      const value = parseFloat(form.discount_value);
      if (!Number.isFinite(value) || value <= 0) throw new Error('Valor de descuento inválido');
      if (form.discount_type === 'percentage' && value > 100) throw new Error('El porcentaje no puede superar 100');
      const maxUses = form.max_uses ? parseInt(form.max_uses, 10) : null;
      if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses <= 0)) throw new Error('Usos máximos inválido');
      const minPurchase = form.minimum_purchase_amount ? parseFloat(form.minimum_purchase_amount) : 0;
      if (!Number.isFinite(minPurchase) || minPurchase < 0) throw new Error('Compra mínima inválida');

      const expirationIso = form.expiration_date ? new Date(form.expiration_date).toISOString() : null;

      const { data: inserted, error: couponErr } = await supabase
        .from('coupons')
        .insert({
          code,
          discount_type: form.discount_type,
          discount_value: value,
          expiration_date: expirationIso,
          max_uses: maxUses,
          minimum_purchase_amount: minPurchase,
          single_use: form.single_use,
          is_active: true,
          zumbita_request_id: req.id,
        })
        .select('id')
        .single();
      if (couponErr) throw couponErr;

      if (form.product_ids.length > 0 && inserted) {
        const rows = form.product_ids.map(pid => ({ coupon_id: inserted.id, product_id: pid }));
        const { error: linkErr } = await supabase.from('coupon_products').insert(rows);
        if (linkErr) throw linkErr;
      }

      const { error: updErr } = await supabase
        .from('zumbita_discount_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);
      if (updErr) throw updErr;

      return { req, code, expirationDate: expirationIso };
    },
    onSuccess: (result) => {
      toast.success(`Cupón ${result.code} creado`);
      qc.invalidateQueries({ queryKey: ['zumbita-requests'] });
      setCouponModal(null);
      setGeneratedCoupon(result);
    },
    onError: (e: any) => toast.error(e.message || 'No se pudo crear el cupón'),
  });

  function openCouponModal(req: ZumbitaRequest) {
    setForm({
      code: suggestCode(req.customer_name),
      discount_type: 'percentage',
      discount_value: '10',
      expiration_date: defaultExpiration(),
      max_uses: '1',
      minimum_purchase_amount: '0',
      single_use: true,
      product_ids: [],
    });
    setProductSearch('');
    setCouponModal(req);
  }

  const filtered = requests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.customer_name.toLowerCase().includes(s) ||
        (r.email || '').toLowerCase().includes(s) ||
        (r.whatsapp || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o WhatsApp"
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === opt.key ? 'bg-espresso text-white' : 'bg-cream text-warm-gray hover:bg-blush'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-warm-gray">
          Cargando solicitudes...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-cream flex items-center justify-center">
            <MessageSquare size={24} className="text-dusty-pink" />
          </div>
          <h3 className="font-display text-lg font-bold text-espresso mb-2">Sin solicitudes</h3>
          <p className="text-sm text-warm-gray">
            Cuando recibas solicitudes desde Zumbita van a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const status = (req.status as RequestStatus) || 'pending';
            const isPending = updateStatus.isPending;
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-display text-base font-bold text-espresso truncate">{req.customer_name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[status]}`}>
                        {statusLabels[status]}
                      </span>
                      {req.verified_alumna && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sage/20 text-emerald-700">
                          <BadgeCheck size={12} />
                          Alumna verificada
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-warm-gray mb-3">
                      {req.email ? (
                        <a href={`mailto:${req.email}`} className="flex items-center gap-2 hover:text-espresso truncate">
                          <Mail size={13} className="shrink-0 text-dusty-pink" />
                          <span className="truncate">{req.email}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-2 text-warm-gray/60 truncate">
                          <Mail size={13} className="shrink-0" />
                          <span className="truncate">Sin email</span>
                        </span>
                      )}
                      {req.whatsapp && (
                        <a
                          href={`https://wa.me/${req.whatsapp.replace(/\D/g, '')}`}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 hover:text-espresso truncate"
                        >
                          <Phone size={13} className="shrink-0 text-dusty-pink" />
                          <span className="truncate">{req.whatsapp}</span>
                        </a>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wider">Recibida:</span>
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                    </div>

                    {req.message && (
                      <div className="bg-cream/60 border border-gray-100 rounded-lg p-3 text-sm text-espresso/90 whitespace-pre-wrap">
                        {req.message}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row lg:flex-col gap-2 lg:w-56 shrink-0">
                    <button
                      disabled={isPending}
                      onClick={() => openCouponModal(req)}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-espresso text-white hover:bg-espresso/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Check size={14} />
                      Aprobar y generar código
                    </button>
                    <button
                      disabled={isPending || status === 'rejected'}
                      onClick={() => updateStatus.mutate({ id: req.id, status: 'rejected' })}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-cream text-espresso hover:bg-blush disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <X size={14} />
                      Rechazar
                    </button>
                    <button
                      disabled={toggleVerifiedAlumna.isPending}
                      onClick={() => toggleVerifiedAlumna.mutate({ id: req.id, verified: !req.verified_alumna })}
                      className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
                        req.verified_alumna
                          ? 'bg-sage/20 text-emerald-700 hover:bg-sage/30'
                          : 'bg-cream text-warm-gray hover:bg-blush'
                      }`}
                      title={req.verified_alumna ? 'Quitar verificación de alumna' : 'Marcar como alumna verificada'}
                    >
                      <BadgeCheck size={14} />
                      {req.verified_alumna ? 'Alumna verificada' : 'Verificar alumna'}
                    </button>
                    <button
                      disabled={isPending || status === 'disabled'}
                      onClick={() => setDisableModal(req)}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-cream text-warm-gray hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Ban size={14} />
                      Deshabilitar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Coupon Modal */}
      {couponModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => !createCoupon.isPending && setCouponModal(null)}
        >
          <div
            className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center shrink-0">
                  <Tag size={18} className="text-dusty-pink" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-espresso truncate">
                    Generar cupón para {couponModal.customer_name}
                  </h3>
                  <p className="text-xs text-warm-gray truncate">{couponModal.email || couponModal.whatsapp || '—'}</p>
                </div>
              </div>
              <button
                onClick={() => !createCoupon.isPending && setCouponModal(null)}
                className="p-2 rounded-full hover:bg-cream transition-colors"
              >
                <X size={16} className="text-warm-gray" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-espresso mb-1.5">Código del cupón</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    maxLength={50}
                    placeholder="EJ: ZUMBITA-MARIA"
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, code: appendRandomToCode(f.code) }))}
                    title="Generar código aleatorio"
                    aria-label="Generar código aleatorio"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-md text-espresso hover:bg-cream transition-colors"
                  >
                    <Wand2 size={15} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-espresso mb-1.5">Tipo de descuento</label>
                  <div className="flex gap-2">
                    {(['percentage', 'fixed'] as DiscountType[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, discount_type: t }))}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          form.discount_type === t
                            ? 'bg-espresso text-white'
                            : 'bg-cream text-warm-gray hover:bg-blush'
                        }`}
                      >
                        {t === 'percentage' ? 'Porcentaje (%)' : 'Monto fijo ($)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-espresso mb-1.5">
                    Valor {form.discount_type === 'percentage' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={form.discount_type === 'percentage' ? '1' : '100'}
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-espresso mb-1.5">Fecha de expiración</label>
                  <input
                    type="date"
                    value={form.expiration_date}
                    onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-espresso mb-1.5">
                    Usos máximos <span className="text-warm-gray font-normal">(vacío = ilimitado)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-espresso mb-1.5">Compra mínima ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.minimum_purchase_amount}
                    onChange={e => setForm(f => ({ ...f, minimum_purchase_amount: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-espresso mb-1.5">Modalidad de uso</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, single_use: true }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        form.single_use ? 'bg-espresso text-white' : 'bg-cream text-warm-gray hover:bg-blush'
                      }`}
                    >
                      Un solo uso
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, single_use: false }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        !form.single_use ? 'bg-espresso text-white' : 'bg-cream text-warm-gray hover:bg-blush'
                      }`}
                    >
                      Múltiple
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-espresso">
                    Productos permitidos{' '}
                    <span className="text-warm-gray font-normal">
                      ({form.product_ids.length === 0 ? 'todos' : `${form.product_ids.length} seleccionados`})
                    </span>
                  </label>
                  {form.product_ids.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, product_ids: [] }))}
                      className="text-[11px] text-dusty-pink hover:underline"
                    >
                      Limpiar selección
                    </button>
                  )}
                </div>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Buscar producto"
                    className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
                  />
                </div>
                <div className="border border-gray-100 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-xs text-warm-gray text-center">Sin productos</div>
                  ) : (
                    filteredProducts.map(p => {
                      const checked = form.product_ids.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-espresso hover:bg-cream/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm(f => ({
                                ...f,
                                product_ids: checked
                                  ? f.product_ids.filter(id => id !== p.id)
                                  : [...f.product_ids, p.id],
                              }))
                            }
                            className="accent-dusty-pink"
                          />
                          <span className="flex-1 truncate">{p.name}</span>
                          <span className="text-[10px] text-warm-gray uppercase">{p.category}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-[11px] text-warm-gray mt-1.5">
                  Si no seleccionás ninguno, el cupón aplica a todo el catálogo.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setCouponModal(null)}
                disabled={createCoupon.isPending}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-cream text-espresso hover:bg-blush transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => couponModal && createCoupon.mutate({ req: couponModal, form })}
                disabled={createCoupon.isPending}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-espresso text-white hover:bg-espresso/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                {createCoupon.isPending ? 'Creando...' : 'Crear cupón y aprobar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated coupon success modal */}
      {generatedCoupon && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => setGeneratedCoupon(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center shrink-0">
                  <Sparkles size={18} className="text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-espresso">Cupón generado</h3>
                  <p className="text-xs text-warm-gray truncate">{generatedCoupon.req.customer_name}</p>
                </div>
              </div>
              <button
                onClick={() => setGeneratedCoupon(null)}
                className="p-2 rounded-full hover:bg-cream transition-colors"
              >
                <X size={16} className="text-warm-gray" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="rounded-xl border border-dashed border-dusty-pink/40 bg-cream/60 px-4 py-3 text-center">
                <p className="text-[11px] uppercase tracking-wider text-warm-gray mb-1">Código</p>
                <p className="font-display text-xl font-bold text-espresso tracking-wider break-all">{generatedCoupon.code}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-gray">Válido hasta</span>
                <span className="font-semibold text-espresso">{formatExpirationLong(generatedCoupon.expirationDate)}</span>
              </div>

              <div className="rounded-xl bg-cream/50 border border-gray-100 p-3 text-xs text-espresso/90 whitespace-pre-wrap font-body">
                {buildWhatsAppMessage(generatedCoupon.req.customer_name, generatedCoupon.code, generatedCoupon.expirationDate)}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const msg = buildWhatsAppMessage(generatedCoupon.req.customer_name, generatedCoupon.code, generatedCoupon.expirationDate);
                    try {
                      await navigator.clipboard.writeText(msg);
                      toast.success('Mensaje copiado');
                    } catch {
                      toast.error('No se pudo copiar');
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-cream text-espresso hover:bg-blush transition-colors"
                >
                  <Copy size={14} />
                  Copiar mensaje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const phone = (generatedCoupon.req.whatsapp || '').replace(/\D/g, '');
                    if (!phone) {
                      toast.error('Esta solicitud no tiene número de WhatsApp');
                      return;
                    }
                    window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-espresso text-white hover:bg-espresso/90 transition-colors"
                >
                  <Send size={14} />
                  Abrir WhatsApp
                </button>
              </div>
              <p className="text-[11px] text-warm-gray text-center">
                Revisá el mensaje antes de enviarlo. El envío es manual.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disable confirmation modal */}
      {disableModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => !disableBenefit.isPending && setDisableModal(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center shrink-0">
                  <Ban size={18} className="text-dusty-pink" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-espresso">
                    Deshabilitar beneficio
                  </h3>
                  <p className="text-xs text-warm-gray mt-0.5 truncate">
                    {disableModal.customer_name}{disableModal.email ? ` · ${disableModal.email}` : ''}
                  </p>
                </div>
              </div>
              <p className="text-sm text-espresso/90 mb-2">
                Vas a desactivar el beneficio de esta alumna. Si ya se generó un cupón, se va a desactivar y no podrá usarse en futuras compras.
              </p>
              <p className="text-xs text-warm-gray">
                La solicitud va a quedar marcada como <span className="font-semibold">Deshabilitada</span>.
              </p>
            </div>
            <div className="border-t border-gray-100 px-5 py-3 sm:px-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setDisableModal(null)}
                disabled={disableBenefit.isPending}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-cream text-espresso hover:bg-blush transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => disableModal && disableBenefit.mutate(disableModal)}
                disabled={disableBenefit.isPending}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-espresso text-white hover:bg-espresso/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <Ban size={14} />
                {disableBenefit.isPending ? 'Deshabilitando...' : 'Sí, deshabilitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
