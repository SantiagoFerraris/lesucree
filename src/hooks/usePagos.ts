import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ---------- Types ----------
export type TipoPago = 'mercado_pago' | 'efectivo' | 'transferencia';
export type EstadoPago = 'confirmado' | 'pendiente_confirmacion';

export interface Pago {
  id: number;
  order_id: string;
  monto: number;
  tipo: TipoPago;
  estado: EstadoPago;
  fecha_pago: string;
  hora_pago: string;
  fecha_creacion: string;
  notas: string | null;
}

export interface DeudaPedido {
  total_pagado: number;
  deuda_restante: number;
  completamente_pagado: boolean;
  cantidad_pagos: number;
}

export interface PedidoConDeuda {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  desired_date: string;
  total_pagado: number;
  deuda_restante: number;
  estado_deuda: 'pagado' | 'parcial' | 'sin_pagar';
  cantidad_pagos: number;
  porcentaje_pagado: number;
}

export interface EstadisticasCobranza {
  total_pedidos: number;
  pedidos_pagos: number;
  pedidos_parciales: number;
  pedidos_sin_pagar: number;
  total_recaudado: number;
  total_pendiente: number;
  tasa_cobranza: number;
}

export interface NuevoPagoInput {
  monto: number;
  tipo: TipoPago;
  estado?: EstadoPago;
  notas?: string | null;
}

// Supabase types.ts doesn't yet know about order_payments / views / rpc.
// Use a loosely-typed alias for those calls.
const db = supabase as any;

// ---------- usePagos ----------
export function usePagos(orderId: string) {
  const qc = useQueryClient();

  const pagosQuery = useQuery({
    queryKey: ['order-payments', orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<Pago[]> => {
      const { data, error } = await db
        .from('order_payments')
        .select('*')
        .eq('order_id', orderId)
        .order('fecha_pago', { ascending: false });
      if (error) {
        console.error('[usePagos] fetch pagos error:', error);
        throw error;
      }
      return (data ?? []) as Pago[];
    },
  });

  const deudaQuery = useQuery({
    queryKey: ['order-debt', orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<DeudaPedido | null> => {
      const { data, error } = await db.rpc('obtener_deuda_pedido', {
        pedido_id_param: orderId,
      });
      if (error) {
        console.error('[usePagos] fetch deuda error:', error);
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        total_pagado: Number(row.total_pagado ?? 0),
        deuda_restante: Number(row.deuda_restante ?? 0),
        completamente_pagado: Boolean(row.completamente_pagado),
        cantidad_pagos: Number(row.cantidad_pagos ?? 0),
      };
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['order-payments', orderId] });
    qc.invalidateQueries({ queryKey: ['order-debt', orderId] });
    qc.invalidateQueries({ queryKey: ['pedidos-con-deuda'] });
    qc.invalidateQueries({ queryKey: ['estadisticas-cobranza'] });
    qc.invalidateQueries({ queryKey: ['pagos-del-mes'] });
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard-orders'] });
  };

  const crearPago = useMutation({
    mutationFn: async (input: NuevoPagoInput) => {
      const payload = {
        order_id: orderId,
        monto: input.monto,
        tipo: input.tipo,
        estado: input.estado ?? 'confirmado',
        notas: input.notas ?? null,
      };
      const { data, error } = await db
        .from('order_payments')
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error('[usePagos] crearPago error:', error);
        throw error;
      }
      return data as Pago;
    },
    onSuccess: () => {
      toast.success('Pago registrado');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(`No se pudo registrar el pago: ${err?.message ?? 'error desconocido'}`);
    },
  });

  const confirmarPago = useMutation({
    mutationFn: async (pagoId: number) => {
      const { data, error } = await db
        .from('order_payments')
        .update({ estado: 'confirmado' })
        .eq('id', pagoId)
        .select()
        .single();
      if (error) {
        console.error('[usePagos] confirmarPago error:', error);
        throw error;
      }
      return data as Pago;
    },
    onSuccess: () => {
      toast.success('Pago confirmado');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(`No se pudo confirmar el pago: ${err?.message ?? 'error desconocido'}`);
    },
  });

  const eliminarPago = useMutation({
    mutationFn: async (pagoId: number) => {
      const { error } = await db.from('order_payments').delete().eq('id', pagoId);
      if (error) {
        console.error('[usePagos] eliminarPago error:', error);
        throw error;
      }
      return pagoId;
    },
    onSuccess: () => {
      toast.success('Pago eliminado');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(`No se pudo eliminar el pago: ${err?.message ?? 'error desconocido'}`);
    },
  });

  return {
    pagos: pagosQuery.data ?? [],
    deuda: deudaQuery.data ?? null,
    isLoading: pagosQuery.isLoading || deudaQuery.isLoading,
    error: pagosQuery.error || deudaQuery.error,
    crearPago,
    confirmarPago,
    eliminarPago,
    isCargando:
      crearPago.isPending || confirmarPago.isPending || eliminarPago.isPending,
  };
}

// ---------- usePedidosConDeuda ----------
export function usePedidosConDeuda() {
  const query = useQuery({
    queryKey: ['pedidos-con-deuda'],
    queryFn: async (): Promise<PedidoConDeuda[]> => {
      const { data, error } = await db
        .from('vista_deuda_pedidos')
        .select('*')
        .gt('deuda_restante', 0)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[usePedidosConDeuda] error:', error);
        throw error;
      }
      return (data ?? []) as PedidoConDeuda[];
    },
  });

  return {
    pedidos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    recargar: query.refetch,
  };
}

// ---------- useEstadisticasCobranza ----------
export function useEstadisticasCobranza() {
  const query = useQuery({
    queryKey: ['estadisticas-cobranza'],
    queryFn: async (): Promise<EstadisticasCobranza | null> => {
      const { data, error } = await db
        .from('vista_estadisticas_cobranza')
        .select('*')
        .maybeSingle();
      if (error) {
        console.error('[useEstadisticasCobranza] error:', error);
        throw error;
      }
      return (data ?? null) as EstadisticasCobranza | null;
    },
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
  };
}

// ---------- usePagosDelMes ----------
export function usePagosDelMes() {
  const query = useQuery({
    queryKey: ['pagos-del-mes'],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const { data, error } = await db
        .from('order_payments')
        .select('*')
        .eq('estado', 'confirmado')
        .gte('fecha_pago', firstDay)
        .order('fecha_pago', { ascending: false });
      if (error) {
        console.error('[usePagosDelMes] error:', error);
        throw error;
      }
      return (data ?? []) as Pago[];
    },
  });

  const pagosDelMes = query.data ?? [];
  const totalRecaudadoMes = pagosDelMes.reduce(
    (sum, p) => sum + Number(p.monto ?? 0),
    0,
  );

  return {
    pagosDelMes,
    totalRecaudadoMes,
    isLoading: query.isLoading,
  };
}
