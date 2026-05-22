import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronDown, ChevronUp, Download, MessageCircle, ShoppingBag, Trash2, ArrowUpDown, Check, Plus, Upload, Wallet } from 'lucide-react';
import ManualOrderModal from '@/components/admin/ManualOrderModal';
import ExcelImportModal from '@/components/admin/ExcelImportModal';
import PagosPedidoAdmin from '@/components/admin/PagosPedidoAdmin';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatPrice';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  picked_up: 'Retirado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[#FEF3C7] text-[#92400E]',
  confirmed: 'bg-[#D1FAE5] text-[#065F46]',
  completed: 'bg-green-100 text-green-800',
  picked_up: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_LABELS: Record<string, string> = {
  pendiente: 'Pago Pendiente',
  'seña_recibida': 'Seña Recibida',
  'pagado_completo': 'Pagado',
};

const PAYMENT_COLORS: Record<string, string> = {
  pendiente: 'bg-[#FEE2E2] text-[#991B1B]',
  'seña_recibida': 'bg-[#E0E7FF] text-[#3730A3]',
  'pagado_completo': 'bg-[#3B2617] text-white',
};

const SORT_OPTIONS = [
  { value: 'retiro-asc', label: 'Retiro (más próximo)' },
  { value: 'retiro-desc', label: 'Retiro (más lejano)' },
  { value: 'pedido-desc', label: 'Pedido (más reciente)' },
  { value: 'pedido-asc', label: 'Pedido (más antiguo)' },
  { value: 'monto-desc', label: 'Monto (mayor a menor)' },
  { value: 'monto-asc', label: 'Monto (menor a mayor)' },
  { value: 'cliente-asc', label: 'Cliente (A → Z)' },
];

const DATE_FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'manana', label: 'Mañana' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'vencidos', label: 'Vencidos' },
];

const PAGE_SIZE = 10;
const PAYMENT_SORT_ORDER: Record<string, number> = { pendiente: 0, 'seña_recibida': 1, 'pagado_completo': 2 };

import { getWhatsAppLink } from '@/lib/whatsapp';

function buildWhatsAppUrl(phone: string, message: string): string {
  return getWhatsAppLink(phone, message) ?? '#';
}

// ==================== NUEVA FUNCIÓN ====================
async function createMessageAndSendWhatsApp(
  order: any,
  messageType: 'solicitar_sena' | 'confirmar_sena' | 'pedido_listo',
  supabaseClient: any,
  siteConfig: any,
  queryClient: any,
  formatPriceFn: (price: number) => string
) {
  try {
    const buildMessage = (kind: typeof messageType): string => {
      const customer = order.customer_name || 'cliente';
      const total = Number(order.total) || 0;
      const products = (order.items as any[]).map((i: any) => 
        `• ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity}`
      ).join('\n');
      
      const alias = siteConfig?.alias || '';
      const pickupAddress = siteConfig?.pickup_address || '';
      
      const formatDateHelper = (d: string) => {
        if (!d) return '—';
        const dateObj = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
        if (isNaN(dateObj.getTime())) return '—';
        return dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      };

      if (kind === 'solicitar_sena') {
        const depositSuggested = order.deposit_amount ? Number(order.deposit_amount) : Math.round(total * 0.5);
        return `¡Hola ${customer}! 🎂\nRecibimos tu pedido de Le Sucrée:\n\n📦 ${products}\n\n💰 Total: ${formatPriceFn(total)}\n💳 Seña (50%): ${formatPriceFn(depositSuggested)}\n\nPara reservar tu pedido, te pedimos una seña del 50% por transferencia:\n🔑 Alias: ${alias}\n\n📅 Retiro: ${formatDateHelper(order.desired_date)} — ${order.preferred_time}\n📍 Rosario, Santa Fe\n\nUna vez realizada, envianos el comprobante 😊\n¡Gracias! 🤎`;
      }
      if (kind === 'confirmar_sena') {
        return `¡Hola ${customer}! 💚\nRecibimos tu seña correctamente, ¡gracias!\n\nTu pedido ya quedó reservado 🙌\n\n📍 Dirección de retiro:\n${pickupAddress}\n\n📅 ${formatDateHelper(order.desired_date)} — ${order.preferred_time}\n\n¡Te esperamos! 🤎`;
      }
      return `¡Hola ${customer}! 🎉\nTu pedido de Le Sucrée está listo para retirar.\n\n📅 ${formatDateHelper(order.desired_date)} — ${order.preferred_time}\n\n📍 ${pickupAddress}\n\n¡Te esperamos! 🤎`;
    };

    const messageText = buildMessage(messageType);

    const { error: insertError } = await supabaseClient
      .from('contact_messages')
      .insert({
        name: order.customer_name || 'Cliente',
        email: order.customer_email || '',
        phone: order.customer_phone || '',
        message: messageText,
        order_id: order.id,
        is_auto: true,
        sent: false,
        message_type: messageType,
        read: false,
      });

    if (insertError) {
      console.error('Error inserting message:', insertError);
      toast.error('Error al crear el mensaje');
      return;
    }

    if (messageType === 'confirmar_sena') {
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          is_deposit_confirmed: true,
          last_payment_date: new Date().toISOString(),
        })
        .eq('id', order.id);
      
      if (updateError) console.error('Error updating order:', updateError);
    }

    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin-messages'] });

    toast.success('Mensaje creado y WhatsApp abierto');

    const whatsappUrl = buildWhatsAppUrl(order.customer_phone, messageText);
    window.open(whatsappUrl, '_blank');
  } catch (error) {
    console.error('Error:', error);
    toast.error('Error al procesar la acción');
  }
}
// ======================================================

function getStatusBorder(status: string): string {
  if (status === 'pending') return 'border-l-4 border-l-[#F59E0B]';
  if (status === 'confirmed') return 'border-l-4 border-l-[#10B981]';
  if (status === 'completed' || status === 'picked_up') return 'border-l-4 border-l-emerald-500';
  if (status === 'cancelled') return 'border-l-4 border-l-red-400';
  return '';
}

export default function AdminPedidos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any | null>(null);
  
  const { data: siteConfig } = useQuery({
    queryKey: ['site-settings-config'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('key, value');
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = r.value || ''; });
      return map;
    },
  });

  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('retiro-asc');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkActionKey, setBulkActionKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = (() => { const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();
  const weekEnd = (() => { const d = new Date(today); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Estado actualizado'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, payment_status }: { id: string; payment_status: string }) => {
      const { error } = await supabase.from('orders').update({ payment_status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Estado de pago actualizado'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); },
  });

  const deleteOrders = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('orders').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pedido(s) eliminado(s) correctamente');
      setSelected(new Set());
      setDeleteTarget(null);
      setExpanded(null);
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => {
      toast.error('Error al eliminar. Intentá de nuevo.');
    },
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      for (const id of ids) {
        const { error } = await supabase
          .from('orders')
          .update({ status } as any)
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Estado actualizado en todos los pedidos seleccionados');
      setBulkActionKey(k => k + 1);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => {
      toast.error('Error al actualizar estados.');
    },
  });

  const bulkUpdatePayment = useMutation({
    mutationFn: async ({ ids, payment_status }: { ids: string[]; payment_status: string }) => {
      for (const id of ids) {
        const { error } = await supabase
          .from('orders')
          .update({ payment_status } as any)
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Estado de pago actualizado en todos los pedidos seleccionados');
      setBulkActionKey(k => k + 1);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => {
      toast.error('Error al actualizar pagos.');
    },
  });

  const overdueCount = useMemo(() => {
    return orders?.filter(o => o.desired_date < todayStr && o.status !== 'completed' && o.status !== 'picked_up' && o.status !== 'cancelled').length ?? 0;
  }, [orders, todayStr]);

  const filtered = useMemo(() => {
    let result = orders?.filter(o => {
      const searchLower = search.toLowerCase();
      const matchSearch = !search || o.customer_name.toLowerCase().includes(searchLower)
        || o.id.toLowerCase().includes(searchLower)
        || (o.items as any[])?.some((item: any) => item.productName?.toLowerCase().includes(searchLower));
      const matchStatus = statusFilter === 'todos' || o.status === statusFilter;
      let matchDate = true;
      if (dateFilter === 'hoy') matchDate = o.desired_date === todayStr;
      else if (dateFilter === 'manana') matchDate = o.desired_date === tomorrowStr;
      else if (dateFilter === 'semana') matchDate = o.desired_date >= todayStr && o.desired_date <= weekEnd;
      else if (dateFilter === 'vencidos') matchDate = o.desired_date < todayStr && o.status !== 'completed' && o.status !== 'picked_up' && o.status !== 'cancelled';
      return matchSearch && matchStatus && matchDate;
    }) || [];

    result = [...result].sort((a, b) => {
      let primary = 0;
      if (sortBy === 'retiro-asc') primary = a.desired_date.localeCompare(b.desired_date);
      else if (sortBy === 'retiro-desc') primary = b.desired_date.localeCompare(a.desired_date);
      else if (sortBy === 'pedido-desc') primary = (b.created_at || '').localeCompare(a.created_at || '');
      else if (sortBy === 'pedido-asc') primary = (a.created_at || '').localeCompare(b.created_at || '');
      else if (sortBy === 'monto-desc') primary = Number(b.total) - Number(a.total);
      else if (sortBy === 'monto-asc') primary = Number(a.total) - Number(b.total);
      else if (sortBy === 'cliente-asc') primary = a.customer_name.localeCompare(b.customer_name, 'es');

      if (primary !== 0) return primary;

      if (sortBy.startsWith('retiro') || sortBy.startsWith('pedido')) {
        return (PAYMENT_SORT_ORDER[a.payment_status] ?? 1) - (PAYMENT_SORT_ORDER[b.payment_status] ?? 1);
      }
      if (sortBy.startsWith('monto') || sortBy.startsWith('cliente')) {
        return a.desired_date.localeCompare(b.desired_date);
      }
      return 0;
    });

    return result;
  }, [orders, search, statusFilter, dateFilter, sortBy, todayStr, tomorrowStr, weekEnd]);

  const statusCounts = useMemo(() => {
    if (!orders) return {};
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  }, [orders]);

  const totalPages = Math.ceil((filtered?.length || 0) / PAGE_SIZE);
  const paginated = filtered?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (d: string) => {
    if (!d) return '—';
    const dateObj = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
    if (isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getProductSummary = (items: any[]) => {
    if (!items?.length) return '';
    const first = items[0]?.productName || '';
    if (items.length === 1) return first;
    return `${first} + ${items.length - 1} más`;
  };

  const getDeliveryBadge = (desiredDate: string, status: string) => {
    if (status === 'completed' || status === 'picked_up' || status === 'cancelled') {
      return null;
    }
    const deliveryDate = new Date(desiredDate + 'T12:00:00');
    const todayDate = new Date(todayStr + 'T12:00:00');
    const diffDays = Math.round((deliveryDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `⚠ Hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}`, className: 'bg-[#FEE2E2] text-[#DC2626]' };
    if (diffDays === 0) return { text: '🔴 HOY', className: 'bg-[#FEF3C7] text-[#D97706]' };
    if (diffDays === 1) return { text: '🟡 Mañana', className: 'bg-[#FEF9C3] text-[#A16207]' };
    return { text: `En ${diffDays} días`, className: 'bg-[#F0FDF4] text-[#15803D]' };
  };

  const sortLabel = SORT_OPTIONS.find(s => s.value === sortBy)?.label ?? '';
  const subtitle = `${filtered?.length ?? 0} ${(filtered?.length ?? 0) === 1 ? 'pedido' : 'pedidos'} · Ordenados por ${sortLabel.toLowerCase()}`;

  const exportCSV = () => {
    if (!filtered?.length) return;
    const headers = ['ID', 'Cliente', 'Email', 'Teléfono', 'Fecha Pedido', 'Fecha Retiro', 'Horario', 'Productos', 'Total', 'Estado', 'Estado de Pago', 'Notas'];
    const rows = filtered.map(o => [
      o.id.slice(0, 8).toUpperCase(),
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      formatDate(o.created_at),
      formatDate(o.desired_date),
      o.preferred_time,
      (o.items as any[]).map((i: any) => `${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity}`).join('; '),
      o.total,
      STATUS_LABELS[o.status] || o.status,
      PAYMENT_LABELS[o.payment_status] || 'Pendiente',
      o.notes || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pedidos_${todayStr}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const getWhatsAppMessages = (o: any) => {
    const products = (o.items as any[]).map((i: any) => `• ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity}`).join('\n');
    const alias = siteConfig?.alias || '';
    const pickupAddress = siteConfig?.pickup_address || '';
    return {
      confirm: `¡Hola ${o.customer_name}! 🎂\nRecibimos tu pedido de Le Sucrée:\n\n📦 ${products}\n\n💰 Total: ${formatPrice(o.total)}\n💳 Seña (50%): ${formatPrice(o.total / 2)}\n\nPara reservar tu pedido, te pedimos una seña del 50% por transferencia:\n🔑 Alias: ${alias}\n\n📅 Retiro: ${formatDate(o.desired_date)} — ${o.preferred_time}\n📍 Rosario, Santa Fe\n\nUna vez realizada, envianos el comprobante 😊\n¡Gracias! 🤎`,
      remind: `¡Hola ${o.customer_name}! 💖\nRecibimos tu seña correctamente, ¡gracias!\n\nTu pedido ya quedó reservado 🙌\n\n📍 Dirección de retiro:\n${pickupAddress}\n\n📅 ${formatDate(o.desired_date)} — ${o.preferred_time}\n\n¡Te esperamos! 🤎`,
      ready: `¡Hola ${o.customer_name}! 🎉\nTu pedido de Le Sucrée está listo para retirar.\n\n📅 ${formatDate(o.desired_date)} — ${o.preferred_time}\n\n📍 ${pickupAddress}\n\n¡Te esperamos! 🤎`,
    };
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!paginated) return;
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map(o => o.id)));
    }
  };

  const allPageSelected = (paginated?.length ?? 0) > 0 && paginated!.every(o => selected.has(o.id));

  const handleBulkDelete = () => {
    setDeleteTarget({
      ids: Array.from(selected),
      label: `${selected.size} pedido${selected.size > 1 ? 's' : ''}`,
    });
  };

  const handleDeleteOne = (o: any) => {
    setDeleteTarget({
      ids: [o.id],
      label: `el pedido #${o.id.slice(0, 8).toUpperCase()} de ${o.customer_name}`,
    });
  };

  const confirmDelete = () => {
    if (deleteTarget) deleteOrders.mutate(deleteTarget.ids);
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-espresso">Pedidos</h2>
      <p className="text-xs text-[#9B8578] mb-5 mt-1">{subtitle}</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
          <input
            placeholder="Buscar por nombre, ID o producto..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); setSelected(new Set()); }}
            className="w-full sm:w-64 rounded-lg border border-[#E8DDD4] bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); setSelected(new Set()); }}
          className="rounded-lg border border-[#E8DDD4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
        >
          <option value="todos">Todos los estados</option>
          <option value="pending">Pendiente ({statusCounts.pending || 0})</option>
          <option value="confirmed">Confirmado ({statusCounts.confirmed || 0})</option>
          <option value="completed">Completado ({statusCounts.completed || 0})</option>
          <option value="cancelled">Cancelado ({statusCounts.cancelled || 0})</option>
        </select>

        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-2 rounded-lg border border-[#E8DDD4] bg-white px-3 py-2 text-sm text-[#7C6354] hover:bg-[#FFFBF5] transition-colors w-full sm:w-auto"
          >
            <ArrowUpDown size={14} />
            <span className="truncate">{sortLabel}</span>
            <ChevronDown size={14} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-[#E8DDD4] rounded-lg shadow-lg py-1 min-w-[220px] animate-in fade-in slide-in-from-top-1 duration-150">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-[#FFFBF5] transition-colors ${sortBy === opt.value ? 'text-[#3B2617] font-semibold' : 'text-[#7C6354]'}`}
                >
                  {opt.label}
                  {sortBy === opt.value && <Check size={14} className="text-[#3B2617]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (<>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8DDD4] bg-white text-sm">
              <span className="text-xs font-semibold text-[#9B8578] uppercase whitespace-nowrap">Estado:</span>
              <select key={bulkActionKey}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    bulkUpdateStatus.mutate({ ids: Array.from(selected), status: e.target.value });
                  }
                }}
                className="rounded-lg border border-[#E8DDD4] bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
              >
                <option value="" disabled>Cambiar...</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmado</option>
                <option value="completed">Completado</option>
                <option value="picked_up">Retirado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8DDD4] bg-white text-sm">
              <span className="text-xs font-semibold text-[#9B8578] uppercase whitespace-nowrap">Pago:</span>
              <select key={bulkActionKey}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    bulkUpdatePayment.mutate({ ids: Array.from(selected), payment_status: e.target.value });
                  }
                }}
                className="rounded-lg border border-[#E8DDD4] bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
              >
                <option value="" disabled>Cambiar...</option>
                <option value="pendiente">Pago Pendiente</option>
                <option value="seña_recibida">Seña Recibida</option>
                <option value="pagado_completo">Pagado Completo</option>
              </select>
            </div>
            <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-sm text-red-600 font-semibold hover:bg-red-100 transition-colors">
              <Trash2 size={14} /> Eliminar ({selected.size})
            </button>
          </>)}
          <button onClick={() => setShowManualOrder(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3B2617] text-sm text-white font-semibold hover:bg-[#3B2617]/90 transition-colors">
            <Plus size={14} /> Nuevo Pedido
          </button>
          <button onClick={() => setShowExcelImport(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8DDD4] bg-white text-sm text-[#7C6354] hover:bg-[#FFFBF5] transition-colors">
            <Upload size={14} /> Importar Excel
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8DDD4] bg-white text-sm text-[#7C6354] hover:bg-[#FFFBF5] transition-colors">
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {DATE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setDateFilter(f.value); setPage(0); setSelected(new Set()); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              dateFilter === f.value ? 'bg-espresso text-white' : 'bg-cream text-warm-gray hover:bg-blush'
            }`}
          >
            {f.label}
            {f.value === 'vencidos' && overdueCount > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold ${dateFilter === 'vencidos' ? 'bg-white text-red-600' : 'bg-red-500 text-white'}`}>
                {overdueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E8DDD4] p-4">
              <div className="flex gap-4">
                <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : !paginated?.length ? (
        <div className="text-center py-12">
          <ShoppingBag size={40} className="mx-auto text-warm-gray/30 mb-3" />
          <p className="text-warm-gray">No hay pedidos todavía.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 py-2 mb-1">
            <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} />
            <span className="text-xs text-warm-gray font-semibold">Seleccionar todos</span>
          </div>

          <div className="hidden lg:grid grid-cols-[40px_80px_1fr_90px_100px_100px_1fr_100px_110px_60px] items-center gap-2 px-4 py-2 border-b border-[#E8DDD4] mb-2">
            <span />
            <span className="text-[11px] uppercase tracking-wider text-[#9B8578] font-semibold">ID</span>
            <span className="text-[11px] uppercase tracking-wider text-[#9B8578] font-semibold">Cliente</span>
            <span className="text-[11px] uppercase tracking-wider text-[#9B8578] font-semibold">Pedido</span>
            <span className="text-[11px] uppercase tracking-wider text-[#9B8578] font-semibold">Retiro</span>
            <span className="text-[11px] uppercase tracking-wider text-[#9B8578] font-semibold">Monto</span>
            <span className="text-[11px] uppercase tracking-wider text-[#9B8578] font-semibold">Producto</span>
            <span className="text-[11px] uppercase tracking-wider text-[#9B8578] font-semibold">Estado</span>
            <span className="text-[11px] uppercase tracking-wider text-[#9B8578] font-semibold">Pago</span>
            <span />
          </div>
<div className="space-y-2">
            {paginated.map(o => {
              const deliveryBadge = getDeliveryBadge(o.desired_date, o.status);
              return (
                <div key={o.id} className={`bg-white rounded-[10px] shadow-sm border border-[#F0E8E0] overflow-hidden transition-all hover:shadow-md hover:-translate-y-[1px] ${getStatusBorder(o.status)}`}>
                  <div className="hidden lg:grid grid-cols-[40px_80px_1fr_90px_100px_100px_1fr_100px_110px_60px] items-center gap-2 px-4 py-3">
                    <Checkbox
                      checked={selected.has(o.id)}
                      onCheckedChange={() => toggleSelect(o.id)}
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="text-xs font-mono text-[#9B8578] cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>#{o.id.slice(0, 8).toUpperCase()}</span>
                    <span className="font-semibold text-sm text-[#3B2617] truncate cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>{o.customer_name}</span>
                    <span className="text-xs text-[#9B8578] cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>{formatDate(o.created_at)}</span>
                    <div className="flex flex-col gap-0.5 cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                      {deliveryBadge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold inline-block w-fit ${deliveryBadge.className}`}>{deliveryBadge.text}</span>
                      )}
                      <span className="text-[10px] text-[#9B8578]">{formatDate(o.desired_date)}</span>
                    </div>
                    <span className="font-semibold text-sm text-[#3B2617] cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>{formatPrice(o.total)}</span>
                    <span className="text-xs text-[#7C6354] truncate cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>{getProductSummary(o.items as any[])}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold inline-block w-fit ${STATUS_COLORS[o.status] || ''}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold inline-block w-fit ${PAYMENT_COLORS[o.payment_status] || PAYMENT_COLORS.pendiente}`}>
                      {PAYMENT_LABELS[o.payment_status] || 'Pago Pendiente'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteOne(o); }}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar pedido"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                        {expanded === o.id ? <ChevronUp size={14} className="text-[#9B8578]" /> : <ChevronDown size={14} className="text-[#9B8578]" />}
                      </div>
                    </div>
                  </div>

                  <div className="lg:hidden p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Checkbox
                          checked={selected.has(o.id)}
                          onCheckedChange={() => toggleSelect(o.id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-[#9B8578]">#{o.id.slice(0, 8).toUpperCase()}</span>
                            <span className="font-semibold text-sm text-[#3B2617]">{o.customer_name}</span>
                            <span className="font-semibold text-sm text-[#3B2617]">{formatPrice(o.total)}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mt-1.5">
                            <span className="text-xs text-[#9B8578]">{formatDate(o.created_at)}</span>
                            <span className="text-xs text-[#9B8578]">→ {formatDate(o.desired_date)}</span>
                            {deliveryBadge && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${deliveryBadge.className}`}>{deliveryBadge.text}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mt-1.5">
                            <span className="text-xs text-[#7C6354]">{getProductSummary(o.items as any[])}</span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status] || ''}`}>
                              {STATUS_LABELS[o.status] || o.status}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${PAYMENT_COLORS[o.payment_status] || PAYMENT_COLORS.pendiente}`}>
                              {PAYMENT_LABELS[o.payment_status] || 'Pago Pendiente'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteOne(o); }}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                          {expanded === o.id ? <ChevronUp size={14} className="text-[#9B8578]" /> : <ChevronDown size={14} className="text-[#9B8578]" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {expanded === o.id && (
                    <div className="px-4 pb-4 border-t border-[#F0E8E0] pt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div><span className="text-[#9B8578]">Tel:</span> <span className="text-[#3B2617]">{o.customer_phone}</span></div>
                        <div><span className="text-[#9B8578]">Email:</span> <span className="text-[#3B2617]">{o.customer_email}</span></div>
                        <div><span className="text-[#9B8578]">Horario:</span> <span className="text-[#3B2617]">{o.preferred_time}</span></div>
                      </div>

                      {(() => {
                        const total = Number(o.total) || 0;
                        const paid = Number(o.deposit_amount) || 0;
                        const remaining = Math.max(0, total - paid);
                        const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                        return (
                          <div className="rounded-lg border border-[#F0E8E0] bg-[#FFFBF5] p-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                            <span className="text-[#9B8578]">Seña: <strong className="text-espresso">{formatPrice(paid)} / {formatPrice(total)}</strong></span>
                            <span className="text-[#9B8578]">Saldo: <strong className={remaining > 0 ? 'text-red-600' : 'text-emerald-700'}>{formatPrice(remaining)}</strong></span>
                            <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                              <div className="flex-1 h-1.5 rounded-full bg-[#F0E8E0] overflow-hidden">
                                <div className={`h-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
                              </div>
                              <span className="font-semibold text-espresso">{progress}%</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setPaymentOrder(o); }}
                              className="flex items-center gap-1.5 rounded-lg bg-espresso text-white px-3 py-1.5 text-xs font-semibold hover:bg-espresso/90"
                            >
                              <Wallet size={13} /> Gestionar Pagos
                            </button>
                          </div>
                        );
                      })()}

                      {o.notes && <p className="text-sm text-[#7C6354] bg-[#FFFBF5] rounded-lg p-3">{o.notes}</p>}
                      <div className="space-y-1">
                        {(o.items as any[]).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-[#3B2617]">
                              {item.productName}{item.variantLabel ? ` — ${item.variantLabel}` : ''} x{item.quantity}
                            </span>
                            <span className="text-[#3B2617] font-semibold">{formatPrice(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-[#9B8578] uppercase">Estado:</label>
                          <select
                            value={o.status}
                            onChange={e => updateStatus.mutate({ id: o.id, status: e.target.value })}
                            className="rounded-lg border border-[#E8DDD4] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
                          >
                            <option value="pending">Pendiente</option>
                            <option value="confirmed">Confirmado</option>
                            <option value="completed">Completado</option>
                            <option value="picked_up">Retirado</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-[#9B8578] uppercase">Pago:</label>
                          <select
                            value={o.payment_status || 'pendiente'}
                            onChange={e => updatePayment.mutate({ id: o.id, payment_status: e.target.value })}
                            className="rounded-lg border border-[#E8DDD4] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="seña_recibida">Seña Recibida</option>
                            <option value="pagado_completo">Pagado Completo</option>
                          </select>
                        </div>
                      </div>
                      {o.status !== 'completed' && o.status !== 'picked_up' && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {o.status === 'pending' && (
                            <button 
                              onClick={() => createMessageAndSendWhatsApp(o, 'solicitar_sena', supabase, siteConfig, qc, formatPrice)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DDD4] text-xs text-[#7C6354] hover:bg-[#FFFBF5] transition-colors">
                              <MessageCircle size={13} className="text-green-600" /> Solicitar Seña
                            </button>
                          )}
                          <button 
                            onClick={() => createMessageAndSendWhatsApp(o, 'confirmar_sena', supabase, siteConfig, qc, formatPrice)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DDD4] text-xs text-[#7C6354] hover:bg-[#FFFBF5] transition-colors">
                            <MessageCircle size={13} className="text-green-600" /> Confirmar Seña
                          </button>
                          <button 
                            onClick={() => createMessageAndSendWhatsApp(o, 'pedido_listo', supabase, siteConfig, qc, formatPrice)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DDD4] text-xs text-[#7C6354] hover:bg-[#FFFBF5] transition-colors">
                            <MessageCircle size={13} className="text-green-600" /> Pedido Listo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => { setPage(i); setSelected(new Set()); }} className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${page === i ? 'bg-dusty-pink text-white' : 'text-warm-gray hover:bg-blush'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <ManualOrderModal open={showManualOrder} onOpenChange={setShowManualOrder} />
      <ExcelImportModal open={showExcelImport} onOpenChange={setShowExcelImport} existingOrders={orders || []} />
      {paymentOrder && (
        <PagosPedidoAdmin order={paymentOrder} open={!!paymentOrder} onOpenChange={(v) => !v && setPaymentOrder(null)} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget && deleteTarget.ids.length === 1
                ? '¿Eliminar este pedido?'
                : `¿Eliminar ${deleteTarget?.ids.length} pedidos?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.ids.length === 1
                ? `Se eliminará permanentemente ${deleteTarget.label}. Esta acción no se puede deshacer.`
                : `Se eliminarán permanentemente ${deleteTarget?.label}. Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteOrders.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
