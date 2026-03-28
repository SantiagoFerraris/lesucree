import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/formatPrice';

export function useRealtimeOrders() {
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as any;
          toast(`🎂 Nuevo pedido de ${order.customer_name} — ${formatPrice(Number(order.total))}`, {
            duration: 6000,
          });
          // Invalidate dashboard & pedidos queries
          qc.invalidateQueries({ queryKey: ['admin-dashboard-orders'] });
          qc.invalidateQueries({ queryKey: ['admin-orders'] });
          qc.invalidateQueries({ queryKey: ['admin-dashboard-messages'] });
          // Update pending count in localStorage for badge
          const now = new Date().toISOString();
          localStorage.setItem('lastNewOrderAt', now);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_messages' },
        () => {
          toast('📩 Nuevo mensaje de contacto', { duration: 4000 });
          qc.invalidateQueries({ queryKey: ['admin-dashboard-messages'] });
          qc.invalidateQueries({ queryKey: ['admin-messages'] });
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}
