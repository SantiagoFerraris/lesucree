import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSidebarBadges() {
  const { data: pendingOrders } = useQuery({
    queryKey: ['sidebar-pending-orders'],
    queryFn: async () => {
      const lastVisited = localStorage.getItem('lastVisitedPedidos') || '2000-01-01T00:00:00Z';
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gt('created_at', lastVisited);
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: unreadMessages } = useQuery({
    queryKey: ['sidebar-unread-messages'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return {
    pendingOrders: pendingOrders || 0,
    unreadMessages: unreadMessages || 0,
  };
}
