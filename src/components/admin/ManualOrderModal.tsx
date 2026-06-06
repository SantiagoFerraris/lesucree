import { useEffect, useState } from 'react';
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
  category: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  productPrice?: number;
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  variants: { label: string; price: number }[];
}

function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, it) => sum + (Number(it.productPrice) || 0) * (Number(it.quantity) || 0), 0);
}

function resolveItemPrice(item: { productName: string; variantLabel: string }, products: ProductRow[]): number | undefined {
  const p = products.find(pr => pr.name === item.productName);
  if (!p) return undefined;
  if (item.variantLabel) {
    const v = p.variants?.find(v => v.label === item.variantLabel);
    if (v) return Number(v.price);
  }
  return Number(p.price);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CategoryOption { value: string; label: string }


export default function ManualOrderModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const today = new Date();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ category: '', productName: '', variantLabel: '', quantity: 1 }]);
  const [createdAt, setCreatedAt] = useState<Date>(today);
  const [desiredDate, setDesiredDate] = useState<Date | undefined>();
  const [preferredTime, setPreferredTime] = useState('');
  const [total, setTotal] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pendiente');
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('confirmed');
  const [notes, setNotes] = useState('');

  const { data: products = [] } = useQuery<ProductOption[]>({
    queryKey: ['manual-order-products'],
    queryFn: async () => {
      // Admin manual order: load ALL products regardless of status, so inactive
      // internal-bar products can be selected for manual orders.
      const { data } = await supabase.from('products').select('name, category').order('name');
      return (data as any[])?.map(p => ({ name: p.name as string, category: (p.category as string) || '' })) || [];
    },
  });

  const { data: categories = [] } = useQuery<CategoryOption[]>({
    queryKey: ['manual-order-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('value, label').order('sort_order');
      return (data as any[])?.map(c => ({ value: c.value as string, label: c.label as string })) || [];
    },
  });

  const resetForm = () => {
    setCustomerName(''); setCustomerEmail(''); setCustomerPhone('');
    setItems([{ category: '', productName: '', variantLabel: '', quantity: 1 }]);
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Categoría *</Label>
                    <Select
                      value={item.category}
                      onValueChange={v => {
                        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, category: v, productName: '' } : it));
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Producto *</Label>
                    <Select
                      value={item.productName}
                      onValueChange={v => updateItem(i, 'productName', v)}
                      disabled={!item.category}
                    >
                      <SelectTrigger><SelectValue placeholder={item.category ? 'Seleccionar producto...' : 'Elegí una categoría'} /></SelectTrigger>
                      <SelectContent>
                        {products.filter(p => p.category === item.category).map(p => (
                          <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
            <button type="button" onClick={() => setItems(prev => [...prev, { category: '', productName: '', variantLabel: '', quantity: 1 }])}
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
