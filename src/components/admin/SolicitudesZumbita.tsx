import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Ban, Copy, Mail, Phone, MessageSquare, BadgeCheck, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

interface ZumbitaRequest {
  id: string;
  customer_name: string;
  email: string;
  whatsapp: string | null;
  message: string | null;
  is_zumbita_student: boolean;
  status: string;
  created_at: string;
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

function generateCouponCode(name: string) {
  const slug = (name || 'ZUM')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4) || 'ZUM';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ZUMBITA-${slug}-${rand}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SolicitudesZumbita() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | RequestStatus>('all');
  const [search, setSearch] = useState('');

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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RequestStatus }) => {
      const { error } = await supabase
        .from('zumbita_discount_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zumbita-requests'] });
    },
    onError: (e: any) => toast.error(e.message || 'No se pudo actualizar'),
  });

  const approveAndGenerate = useMutation({
    mutationFn: async (req: ZumbitaRequest) => {
      const code = generateCouponCode(req.customer_name);
      const expiration = new Date();
      expiration.setMonth(expiration.getMonth() + 3);

      const { error: couponErr } = await supabase.from('coupons').insert({
        code,
        discount_type: 'percentage',
        discount_value: 10,
        expiration_date: expiration.toISOString(),
        single_use: true,
        is_active: true,
        minimum_purchase_amount: 0,
      });
      if (couponErr) throw couponErr;

      const { error: updateErr } = await supabase
        .from('zumbita_discount_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);
      if (updateErr) throw updateErr;

      return code;
    },
    onSuccess: async (code) => {
      await navigator.clipboard.writeText(code).catch(() => {});
      toast.success(`Código generado: ${code} (copiado)`);
      qc.invalidateQueries({ queryKey: ['zumbita-requests'] });
    },
    onError: (e: any) => toast.error(e.message || 'No se pudo generar el código'),
  });

  const filtered = requests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.customer_name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
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
                filter === opt.key
                  ? 'bg-espresso text-white'
                  : 'bg-cream text-warm-gray hover:bg-blush'
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
          <h3 className="font-display text-lg font-bold text-espresso mb-2">
            Sin solicitudes
          </h3>
          <p className="text-sm text-warm-gray">
            Cuando recibas solicitudes desde Zumbita van a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const status = (req.status as RequestStatus) || 'pending';
            const isPending = updateStatus.isPending || approveAndGenerate.isPending;
            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-display text-base font-bold text-espresso truncate">
                        {req.customer_name}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[status]}`}>
                        {statusLabels[status]}
                      </span>
                      {req.is_zumbita_student && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sage/20 text-emerald-700">
                          <BadgeCheck size={12} />
                          Alumna verificada
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-warm-gray mb-3">
                      <a
                        href={`mailto:${req.email}`}
                        className="flex items-center gap-2 hover:text-espresso truncate"
                      >
                        <Mail size={13} className="shrink-0 text-dusty-pink" />
                        <span className="truncate">{req.email}</span>
                      </a>
                      {req.whatsapp && (
                        <a
                          href={`https://wa.me/${req.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
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

                  {/* Actions */}
                  <div className="flex flex-row lg:flex-col gap-2 lg:w-56 shrink-0">
                    <button
                      disabled={isPending || status === 'approved'}
                      onClick={() => approveAndGenerate.mutate(req)}
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
                      disabled={isPending || status === 'disabled'}
                      onClick={() => updateStatus.mutate({ id: req.id, status: 'disabled' })}
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
    </div>
  );
}
