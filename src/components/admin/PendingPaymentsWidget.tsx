import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatPrice';

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function urgencyColor(days: number, diasVencimiento: number): string {
  if (days < 0 || days < -diasVencimiento) return 'text-red-700 bg-red-50 border-red-200';
  if (days <= 1) return 'text-amber-800 bg-amber-50 border-amber-200';
  return 'text-emerald-700 bg-emerald-50 border-emerald-200';
}

function urgencyLabel(days: number): string {
  if (days < 0) return `Vencido ${Math.abs(days)}d`;
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `En ${days}d`;
}

export default function PendingPaymentsWidget() {
  const navigate = useNavigate();

  const { data: settings } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('key, value').eq('key', 'dias_vencimiento').maybeSingle();
      return { dias_vencimiento: Number((data as any)?.value || 3) };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, total, deposit_amount, remaining_balance, desired_date, status')
        .gt('remaining_balance', 0)
        .neq('status', 'cancelled')
        .neq('status', 'picked_up')
        .order('desired_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 60_000,
  });

  const diasVencimiento = settings?.dias_vencimiento ?? 3;
  const todayStr = new Date().toISOString().split('T')[0];

  const dueToday = useMemo(() => {
    return (orders || [])
      .filter((o) => {
        const orderDate = new Date(o.desired_date + 'T00:00:00');
        const today = new Date();
        const orderDateLocal = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return orderDateLocal.getTime() === todayLocal.getTime();
      })
      .reduce((s, o) => s + Number(o.remaining_balance || 0), 0);
  }, [orders, todayStr]);

  const dueSoonCount = useMemo(() => {
    return (orders || []).filter((o) => {
      const d = daysUntil(o.desired_date);
      return d >= 0 && d <= diasVencimiento;
    }).length;
  }, [orders, diasVencimiento]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Wallet size={18} className="text-espresso" />
        <h3 className="text-sm font-semibold text-espresso">Cobros Pendientes</h3>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-3 text-xs">
        <span className="text-warm-gray">
          Total por cobrar hoy: <span className="font-bold text-espresso">{formatPrice(dueToday)}</span>
        </span>
        <span className="text-warm-gray">
          Próximos a vencer ({diasVencimiento}d): <span className="font-bold text-espresso">{dueSoonCount}</span>
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-200 animate-pulse rounded-lg" />)}
        </div>
      ) : !orders || orders.length === 0 ? (
        <p className="text-sm text-warm-gray text-center py-4">¡Todos los pagos al día! 🎉</p>
      ) : (
        <div className="space-y-1.5">
          {orders.map((o) => {
            const days = daysUntil(o.desired_date);
            const cls = urgencyColor(days, diasVencimiento);
            return (
              <button
                key={o.id}
                onClick={() => navigate('/admin/pedidos')}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#F0E8E0] hover:border-dusty-pink/40 bg-white px-3 py-2 text-left transition-colors"
              >
                <span className="text-sm text-espresso font-medium truncate">{o.customer_name}</span>
                <span className="text-xs text-warm-gray whitespace-nowrap">
                  {formatPrice(Number(o.deposit_amount || 0))}/{formatPrice(Number(o.total || 0))}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${cls}`}>
                  {urgencyLabel(days)}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => navigate('/admin/pedidos')}
            className="w-full text-center text-xs text-dusty-pink hover:text-mauve font-semibold mt-2 transition-colors"
          >
            Ver todos los pedidos →
          </button>
        </div>
      )}
    </div>
  );
}
