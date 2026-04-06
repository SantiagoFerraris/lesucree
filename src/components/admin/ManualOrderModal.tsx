import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface OrderItem {
  productName: string;
  variantLabel: string;
  quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProductAutocomplete({ value, onChange, products }: { value: string; onChange: (v: string) => void; products: string[] }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = value.length >= 2 ? products.filter(p => p.toLowerCase().includes(value.toLowerCase())).slice(0, 6) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Ej: Torta de chocolate"
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E8DDD4] rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(p => (
            <button key={p} type="button" onClick={() => { onChange(p); setShowSuggestions(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[#FFFBF5] text-[#3B2617]">{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManualOrderModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const today = new Date();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ productName: '', variantLabel: '', quantity: 1 }]);
  const [createdAt, setCreatedAt] = useState<Date>(today);
  const [desiredDate, setDesiredDate] = useState<Date | undefined>();
  const [preferredTime, setPreferredTime] = useState('');
  const [total, setTotal] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pendiente');
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('confirmed');
  const [notes, setNotes] = useState('');

  const { data: productNames = [] } = useQuery({
    queryKey: ['product-names-autocomplete'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('name').eq('active', true).order('name');
      return data?.map(p => p.name) || [];
    },
  });

  const resetForm = () => {
    setCustomerName(''); setCustomerEmail(''); setCustomerPhone('');
    setItems([{ productName: '', variantLabel: '', quantity: 1 }]);
    setCreatedAt(today); setDesiredDate(undefined); setPreferredTime('');
    setTotal(''); setPaymentStatus('pendiente'); setDepositAmount('');
    setPaymentMethod(''); setStatus('confirmed'); setNotes('');
  };

  const insertOrder = useMutation({
    mutationFn: async () => {
      const noteParts: string[] = [];
      if (paymentMethod) noteParts.push(`Forma de pago: ${paymentMethod}`);
      if (paymentStatus === 'seña_recibida' && depositAmount) noteParts.push(`Seña: $${depositAmount}`);
      if (notes.trim()) noteParts.push(notes.trim());
      const finalNotes = noteParts.length > 0 ? noteParts.join(' | ') : null;

      const orderItems = items.filter(i => i.productName.trim()).map(i => ({
        productName: i.productName.trim(),
        variantLabel: i.variantLabel.trim() || null,
        quantity: i.quantity || 1,
      }));

      if (!orderItems.length) throw new Error('Agregá al menos un producto');
      if (!customerName.trim()) throw new Error('El nombre del cliente es obligatorio');
      if (!desiredDate) throw new Error('La fecha de retiro es obligatoria');
      if (!total || Number(total) <= 0) throw new Error('El precio total es obligatorio');

      const { error } = await supabase.from('orders').insert({
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || 'manual@lesucree.com',
        customer_phone: customerPhone.trim() || '',
        items: orderItems as any,
        created_at: createdAt.toISOString(),
        desired_date: format(desiredDate, 'yyyy-MM-dd'),
        preferred_time: preferredTime.trim() || 'A coordinar',
        total: Number(total),
        status,
        payment_status: paymentStatus,
        notes: finalNotes,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pedido creado exitosamente');
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || 'Error al crear el pedido'),
  });

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-[#3B2617]">Nuevo Pedido Manual</DialogTitle>
        </DialogHeader>

        <form onSubmit={e => { e.preventDefault(); insertOrder.mutate(); }} className="space-y-5">
          {/* Client */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#9B8578] mb-1">Cliente</legend>
            <div>
              <Label>Cliente *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nombre del cliente" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@ejemplo.com" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="341 555 1234" />
              </div>
            </div>
          </fieldset>

          {/* Products */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#9B8578] mb-1">Productos</legend>
            {items.map((item, i) => (
              <div key={i} className="space-y-2 bg-[#FFFBF5] rounded-lg p-3 relative">
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="absolute top-2 right-2 text-[#9B8578] hover:text-red-500"><X size={14} /></button>
                )}
                <div>
                  <Label>Producto *</Label>
                  <ProductAutocomplete value={item.productName} onChange={v => updateItem(i, 'productName', v)} products={productNames} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tamaño / Variante</Label>
                    <Input value={item.variantLabel} onChange={e => updateItem(i, 'variantLabel', e.target.value)} placeholder="20 cm, 400 grs, x12" />
                  </div>
                  <div>
                    <Label>Cantidad</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setItems(prev => [...prev, { productName: '', variantLabel: '', quantity: 1 }])}
              className="flex items-center gap-1.5 text-xs text-[#7C6354] hover:text-[#3B2617] font-semibold">
              <Plus size={14} /> Agregar otro producto
            </button>
          </fieldset>

          {/* Delivery */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#9B8578] mb-1">Entrega</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha de encargue</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !createdAt && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(createdAt, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={createdAt} onSelect={d => d && setCreatedAt(d)} locale={es} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Fecha de retiro *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !desiredDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {desiredDate ? format(desiredDate, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={desiredDate} onSelect={setDesiredDate} locale={es} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label>Horario preferido</Label>
              <Input value={preferredTime} onChange={e => setPreferredTime(e.target.value)} placeholder="Ej: Mañana 9-12" />
            </div>
          </fieldset>

          {/* Payment */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#9B8578] mb-1">Pago</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Precio total *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9B8578]">$</span>
                  <Input type="number" min={0} step="any" value={total} onChange={e => setTotal(e.target.value)} className="pl-7" placeholder="0" required />
                </div>
              </div>
              <div>
                <Label>Estado de pago</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="seña_recibida">Seña Recibida</SelectItem>
                    <SelectItem value="pagado_completo">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {paymentStatus === 'seña_recibida' && (
              <div>
                <Label>Monto de seña</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9B8578]">$</span>
                  <Input type="number" min={0} value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="pl-7" placeholder="0" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Forma de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado del pedido</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          {/* Notes */}
          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Pedido recibido por WhatsApp" rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={insertOrder.isPending} className="bg-[#3B2617] hover:bg-[#3B2617]/90 text-white">
              {insertOrder.isPending ? 'Guardando...' : 'Crear Pedido'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
