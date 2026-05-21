import { useMemo, useState } from 'react';
import {
  Plus, Trash2, CheckCircle2, Wallet, Banknote, ArrowLeftRight, StickyNote, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePagos, type TipoPago } from '@/hooks/usePagos';
import { formatPrice } from '@/lib/formatPrice';

const COLORS = {
  espresso: '#3B2617',
  dustyPink: '#B8836C',
  blush: '#F5E6DE',
  cream: '#FBF7F2',
  border: '#E8DDD4',
  green: '#5C9A6F',
  yellow: '#D4A24A',
  red: '#C25450',
};

export interface PedidoBasico {
  id: string;
  cliente: string;
  email?: string | null;
  telefono?: string | null;
  total: number;
}

interface Props {
  pedido: PedidoBasico;
  pagosHistorial?: unknown[]; // accepted for API compatibility; live data comes from usePagos
  onPagoRegistrado?: () => void;
}

const TIPO_OPTIONS: { value: TipoPago; label: string; icon: typeof Wallet }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight },
  { value: 'mercado_pago', label: 'Nota / MP', icon: StickyNote },
];

export default function PagosPedidoAdmin({ pedido, onPagoRegistrado }: Props) {
  const { pagos, isLoading, crearPago, confirmarPago, eliminarPago, isCargando } =
    usePagos(pedido.id);

  const [showForm, setShowForm] = useState(false);
  const [monto, setMonto] = useState<string>('');
  const [tipo, setTipo] = useState<TipoPago>('efectivo');

  const totalPagado = useMemo(
    () =>
      pagos
        .filter((p) => p.estado === 'confirmado')
        .reduce((sum, p) => sum + Number(p.monto ?? 0), 0),
    [pagos],
  );
  const deuda = Math.max(0, Number(pedido.total) - totalPagado);
  const porcentaje = pedido.total > 0
    ? Math.min(100, (totalPagado / Number(pedido.total)) * 100)
    : 0;

  const progressColor =
    porcentaje >= 100 ? COLORS.green : porcentaje > 0 ? COLORS.dustyPink : COLORS.red;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto_num = Number(monto);
    if (!monto_num || monto_num <= 0) {
      toast.error('Ingresá un monto válido');
      return;
    }
    if (monto_num > deuda + 0.01) {
      toast.error(`El monto supera la deuda (${formatPrice(deuda)})`);
      return;
    }
    try {
      await crearPago.mutateAsync({ monto: monto_num, tipo, estado: 'confirmado' });
      setMonto('');
      setShowForm(false);
      onPagoRegistrado?.();
    } catch {
      /* toast already shown by hook */
    }
  };

  const handleConfirmar = async (id: number) => {
    try {
      await confirmarPago.mutateAsync(id);
      onPagoRegistrado?.();
    } catch { /* */ }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Eliminar este pago?')) return;
    try {
      await eliminarPago.mutateAsync(id);
      onPagoRegistrado?.();
    } catch { /* */ }
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'Lato, sans-serif', color: COLORS.espresso }}>
      {/* Progress */}
      <div className="rounded-2xl p-5 border" style={{ background: COLORS.cream, borderColor: COLORS.border }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Wallet size={16} style={{ color: COLORS.dustyPink }} />
            Progreso de cobro
          </span>
          <span className="text-sm font-bold" style={{ color: progressColor }}>
            {porcentaje.toFixed(0)}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: COLORS.blush }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${porcentaje}%`, background: progressColor }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="Total" value={formatPrice(Number(pedido.total))} color={COLORS.espresso} />
          <StatCard label="Pagado" value={formatPrice(totalPagado)} color={COLORS.green} />
          <StatCard label="Falta" value={formatPrice(deuda)} color={deuda > 0 ? COLORS.red : COLORS.green} />
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl p-5 border bg-white" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Registrar pago
          </h3>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              disabled={deuda <= 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: COLORS.dustyPink }}
            >
              <Plus size={16} /> Agregar pago
            </button>
          ) : (
            <button
              onClick={() => { setShowForm(false); setMonto(''); }}
              className="text-sm opacity-70 hover:opacity-100"
            >
              Cancelar
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wider opacity-70">
                Monto
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.border, background: COLORS.cream }}
                autoFocus
              />
              <p className="text-xs opacity-60 mt-1">Deuda actual: {formatPrice(deuda)}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wider opacity-70">
                Método
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIPO_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = tipo === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTipo(opt.value)}
                      className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium transition"
                      style={{
                        borderColor: active ? COLORS.dustyPink : COLORS.border,
                        background: active ? COLORS.blush : 'white',
                        color: active ? COLORS.espresso : COLORS.espresso,
                      }}
                    >
                      <Icon size={16} style={{ color: active ? COLORS.dustyPink : COLORS.espresso }} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isCargando}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: COLORS.espresso }}
            >
              <CheckCircle2 size={16} /> Registrar pago
            </button>
          </form>
        )}
      </div>

      {/* History */}
      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: COLORS.border }}>
        <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
          <h3 className="font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Historial de pagos
          </h3>
          <p className="text-xs opacity-60">{pagos.length} pago{pagos.length === 1 ? '' : 's'} registrado{pagos.length === 1 ? '' : 's'}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: COLORS.blush }}>
              <tr>
                <th className="text-left px-3 py-2 font-semibold">#</th>
                <th className="text-right px-3 py-2 font-semibold">Monto</th>
                <th className="text-left px-3 py-2 font-semibold">Método</th>
                <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">Fecha</th>
                <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">Hora</th>
                <th className="text-center px-3 py-2 font-semibold">Estado</th>
                <th className="text-right px-3 py-2 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-6 opacity-60">Cargando...</td></tr>
              ) : pagos.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 opacity-60">Sin pagos todavía.</td></tr>
              ) : (
                pagos.map((p, idx) => {
                  const tipoLabel = TIPO_OPTIONS.find((t) => t.value === p.tipo)?.label ?? p.tipo;
                  const isConfirmado = p.estado === 'confirmado';
                  const badgeColor = isConfirmado ? COLORS.green : COLORS.yellow;
                  return (
                    <tr key={p.id} className="border-t" style={{ borderColor: COLORS.border }}>
                      <td className="px-3 py-2 font-mono text-xs opacity-70">
                        {pagos.length - idx}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{formatPrice(Number(p.monto))}</td>
                      <td className="px-3 py-2">{tipoLabel}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">{p.fecha_pago}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} className="opacity-60" />
                          {p.hora_pago?.slice(0, 5)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: badgeColor + '20', color: badgeColor }}
                        >
                          {isConfirmado ? 'confirmado' : 'pendiente'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {!isConfirmado && (
                            <button
                              onClick={() => handleConfirmar(p.id)}
                              disabled={isCargando}
                              className="p-1.5 rounded-md hover:bg-green-50 transition disabled:opacity-50"
                              title="Confirmar pago"
                            >
                              <CheckCircle2 size={16} style={{ color: COLORS.green }} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEliminar(p.id)}
                            disabled={isCargando}
                            className="p-1.5 rounded-md hover:bg-red-50 transition disabled:opacity-50"
                            title="Eliminar pago"
                          >
                            <Trash2 size={16} style={{ color: COLORS.red }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 bg-white border" style={{ borderColor: COLORS.border }}>
      <div className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">{label}</div>
      <div className="text-base md:text-lg font-bold mt-0.5" style={{ color, fontFamily: 'Playfair Display, serif' }}>
        {value}
      </div>
    </div>
  );
}
