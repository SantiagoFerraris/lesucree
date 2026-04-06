import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, AlertTriangle, Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingOrders: any[];
}

interface ParsedRow {
  rowIndex: number;
  fechaEncargue: string;
  fechaEntrega: string;
  horario: string;
  producto: string;
  tamaño: string;
  seña: number;
  fechaSeña: string;
  saldo: number;
  precio: number;
  formaPago: string;
  cliente: string;
  contacto: string;
  estado: string;
  isValid: boolean;
  invalidReason?: string;
  isDuplicate: boolean;
}

function cleanMoney(val: any): number {
  if (val == null || val === '') return 0;
  const str = String(val).replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num);
}

function parseExcelDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${String(d.d).padStart(2, '0')}/${String(d.m).padStart(2, '0')}/${d.y}`;
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const y = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${y}`;
  }
  return str;
}

function ddmmyyyyToISO(val: string): string {
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return val;
}

function mapStatus(val: string): string {
  const v = (val || '').toLowerCase().trim();
  if (v === 'entregado') return 'completed';
  if (v === 'confirmado') return 'confirmed';
  if (v === 'cancelado') return 'cancelled';
  return 'pending';
}

function derivePaymentStatus(seña: number, saldo: number, precio: number, estado: string): string {
  if (estado.toLowerCase().trim() === 'entregado') return 'pagado_completo';
  if (seña > 0 && saldo > 0) return 'seña_recibida';
  if ((saldo === 0 || !saldo) && precio > 0 && seña > 0) return 'pagado_completo';
  return 'pendiente';
}

export default function ExcelImportModal({ open, onOpenChange, existingOrders }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [skipDelivered, setSkipDelivered] = useState(true);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);
  const [duplicateRows, setDuplicateRows] = useState<Set<number>>(new Set());
  const [confirmedDuplicates, setConfirmedDuplicates] = useState<Set<number>>(new Set());

  const resetState = () => {
    setStep(1); setSheets([]); setSelectedSheet(''); setWorkbook(null);
    setParsedRows([]); setSkipDelivered(true); setImportProgress(0);
    setImportResult(null); setDuplicateRows(new Set()); setConfirmedDuplicates(new Set());
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        const autoSheet = wb.SheetNames.find(s => s.toLowerCase().includes('ventas')) || wb.SheetNames[0];
        setSelectedSheet(autoSheet);
      } catch {
        toast.error('Error al leer el archivo');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseSheet = () => {
    if (!workbook || !selectedSheet) return;
    const ws = workbook.Sheets[selectedSheet];
    const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find header row (look for "Producto" or "Cliente" in first 5 rows)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, raw.length); i++) {
      const row = raw[i].map((c: any) => String(c).toLowerCase());
      if (row.some(c => c.includes('producto') || c.includes('cliente'))) { headerIdx = i; break; }
    }

    const dataRows = raw.slice(headerIdx + 1);
    const parsed: ParsedRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      if (!r || r.every((c: any) => !c && c !== 0)) continue;

      const cliente = String(r[12] || '').trim(); // Col M
      const producto = String(r[3] || '').trim(); // Col D
      const isValid = !!cliente && !!producto;
      const estado = String(r[14] || '').trim(); // Col O
      const precio = cleanMoney(r[10]); // Col K
      const seña = cleanMoney(r[6]); // Col G
      const saldo = cleanMoney(r[8]); // Col I
      const fechaEntrega = parseExcelDate(r[1]); // Col B

      // Duplicate detection
      const desiredDateIso = ddmmyyyyToISO(fechaEntrega);
      const isDuplicate = existingOrders.some(o =>
        o.customer_name?.toLowerCase() === cliente.toLowerCase() &&
        o.desired_date === desiredDateIso &&
        (o.items as any[])?.some((it: any) => it.productName?.toLowerCase() === producto.toLowerCase())
      );

      parsed.push({
        rowIndex: headerIdx + 1 + i + 1,
        fechaEncargue: parseExcelDate(r[0]),
        fechaEntrega,
        horario: String(r[2] || '').trim(),
        producto,
        tamaño: String(r[4] || '').trim(),
        seña,
        fechaSeña: parseExcelDate(r[7]),
        saldo,
        precio,
        formaPago: String(r[11] || '').trim(),
        cliente,
        contacto: String(r[13] || '').trim(),
        estado,
        isValid,
        invalidReason: !cliente ? 'Falta cliente' : !producto ? 'Falta producto' : undefined,
        isDuplicate,
      });
    }

    setParsedRows(parsed);
    setDuplicateRows(new Set(parsed.filter(r => r.isDuplicate).map(r => r.rowIndex)));
    setStep(2);
  };

  const rowsToImport = useMemo(() => {
    return parsedRows.filter(r => {
      if (!r.isValid) return false;
      if (skipDelivered && r.estado.toLowerCase().trim() === 'entregado') return false;
      if (r.isDuplicate && !confirmedDuplicates.has(r.rowIndex)) return false;
      return true;
    });
  }, [parsedRows, skipDelivered, confirmedDuplicates]);

  const doImport = useMutation({
    mutationFn: async () => {
      const batch = rowsToImport.map(r => {
        const noteParts: string[] = ['[Importado desde Excel]'];
        if (r.formaPago) noteParts.push(`Forma de pago: ${r.formaPago}`);
        if (r.seña) noteParts.push(`Seña: $${r.seña}${r.fechaSeña ? ` (${r.fechaSeña})` : ''}`);
        if (r.saldo) noteParts.push(`Saldo: $${r.saldo}`);
        if (r.contacto) noteParts.push(`Contacto: ${r.contacto}`);

        return {
          customer_name: r.cliente,
          customer_email: 'importado@lesucree.com',
          customer_phone: r.contacto || '',
          items: [{ productName: r.producto, variantLabel: r.tamaño || null, quantity: 1 }],
          created_at: r.fechaEncargue ? new Date(ddmmyyyyToISO(r.fechaEncargue) + 'T12:00:00').toISOString() : new Date().toISOString(),
          desired_date: ddmmyyyyToISO(r.fechaEntrega) || new Date().toISOString().split('T')[0],
          preferred_time: r.horario || 'A coordinar',
          total: r.precio || 0,
          status: mapStatus(r.estado),
          payment_status: derivePaymentStatus(r.seña, r.saldo, r.precio, r.estado),
          notes: noteParts.join(' | '),
        };
      });

      const CHUNK = 50;
      let imported = 0;
      let errors = 0;

      for (let i = 0; i < batch.length; i += CHUNK) {
        const chunk = batch.slice(i, i + CHUNK);
        const { error } = await supabase.from('orders').insert(chunk as any);
        if (error) { errors += chunk.length; } else { imported += chunk.length; }
        setImportProgress(Math.round(((i + chunk.length) / batch.length) * 100));
      }

      return { imported, errors };
    },
    onSuccess: (result) => {
      setImportResult(result);
      setStep(4);
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success(`Se importaron ${result.imported} pedidos`);
    },
    onError: () => toast.error('Error durante la importación'),
  });

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;
  const deliveredCount = parsedRows.filter(r => r.estado.toLowerCase().trim() === 'entregado').length;
  const duplicateCount = parsedRows.filter(r => r.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-[#3B2617] flex items-center gap-2">
            <FileSpreadsheet size={20} /> Importar desde Excel
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-[#3B2617] text-white' : 'bg-[#E8DDD4] text-[#9B8578]'}`}>{s}</div>
              {s < 4 && <ChevronRight size={14} className="text-[#9B8578]" />}
            </div>
          ))}
          <span className="text-xs text-[#9B8578] ml-2">
            {step === 1 ? 'Subir archivo' : step === 2 ? 'Vista previa' : step === 3 ? 'Importando...' : 'Resultado'}
          </span>
        </div>

        {/* Step 1: File upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-[#E8DDD4] rounded-xl p-8 text-center">
              <Upload size={32} className="mx-auto text-[#9B8578] mb-3" />
              <p className="text-sm text-[#7C6354] mb-3">Arrastrá o seleccioná tu archivo Excel (.xlsx o .csv)</p>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="mx-auto block text-sm" />
            </div>

            {sheets.length > 0 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#9B8578] uppercase">Hoja a importar</label>
                  <select value={selectedSheet} onChange={e => setSelectedSheet(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-[#E8DDD4] bg-white px-3 py-2 text-sm">
                    {sheets.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Button onClick={parseSheet} className="bg-[#3B2617] hover:bg-[#3B2617]/90 text-white w-full">
                  Continuar <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] font-semibold">{validCount} válidas</span>
              {invalidCount > 0 && <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold">{invalidCount} inválidas</span>}
              {deliveredCount > 0 && <span className="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] font-semibold">{deliveredCount} entregadas</span>}
              {duplicateCount > 0 && <span className="px-3 py-1 rounded-full bg-[#E0E7FF] text-[#3730A3] font-semibold">{duplicateCount} posibles duplicados</span>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={skipDelivered} onCheckedChange={v => setSkipDelivered(!!v)} id="skip-delivered" />
              <label htmlFor="skip-delivered" className="text-sm text-[#7C6354]">Omitir pedidos con estado Entregado</label>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto border border-[#E8DDD4] rounded-lg max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#FFFBF5] sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left text-[#9B8578]">Fila</th>
                    <th className="px-2 py-2 text-left text-[#9B8578]">Cliente</th>
                    <th className="px-2 py-2 text-left text-[#9B8578]">Producto</th>
                    <th className="px-2 py-2 text-left text-[#9B8578]">Entrega</th>
                    <th className="px-2 py-2 text-right text-[#9B8578]">Precio</th>
                    <th className="px-2 py-2 text-left text-[#9B8578]">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 10).map(r => (
                    <tr key={r.rowIndex} className={`border-t border-[#F0E8E0] ${!r.isValid ? 'bg-red-50' : r.isDuplicate ? 'bg-blue-50' : ''}`}>
                      <td className="px-2 py-1.5 text-[#9B8578]">{r.rowIndex}</td>
                      <td className="px-2 py-1.5 text-[#3B2617] font-medium">{r.cliente || <span className="text-red-400 italic">vacío</span>}</td>
                      <td className="px-2 py-1.5 text-[#3B2617]">{r.producto || <span className="text-red-400 italic">vacío</span>}</td>
                      <td className="px-2 py-1.5 text-[#7C6354]">{r.fechaEntrega}</td>
                      <td className="px-2 py-1.5 text-right text-[#3B2617] font-semibold">${r.precio.toLocaleString('es-AR')}</td>
                      <td className="px-2 py-1.5">
                        {!r.isValid && <span className="text-red-500 flex items-center gap-1"><AlertTriangle size={12} />{r.invalidReason}</span>}
                        {r.isValid && r.isDuplicate && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle size={12} className="text-blue-500" />
                            <span className="text-blue-600">Duplicado</span>
                            <Checkbox checked={confirmedDuplicates.has(r.rowIndex)}
                              onCheckedChange={v => {
                                setConfirmedDuplicates(prev => {
                                  const next = new Set(prev);
                                  v ? next.add(r.rowIndex) : next.delete(r.rowIndex);
                                  return next;
                                });
                              }} />
                          </span>
                        )}
                        {r.isValid && !r.isDuplicate && <span className="text-green-600"><Check size={14} /></span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 10 && <p className="text-xs text-[#9B8578]">Mostrando 10 de {parsedRows.length} filas</p>}

            {duplicateCount > 0 && (
              <div className="bg-[#E0E7FF] rounded-lg p-3 text-sm text-[#3730A3]">
                ⚠️ Se encontraron {duplicateCount} posibles duplicados. Marcá los que querés importar igual.
              </div>
            )}

            <div className="bg-[#FFFBF5] rounded-lg p-3 text-sm text-[#7C6354]">
              Se importarán <strong>{rowsToImport.length}</strong> pedidos
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Volver</Button>
              <Button onClick={() => { setStep(3); doImport.mutate(); }}
                disabled={rowsToImport.length === 0}
                className="bg-[#3B2617] hover:bg-[#3B2617]/90 text-white">
                Importar {rowsToImport.length} pedidos
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Progress */}
        {step === 3 && (
          <div className="py-8 space-y-4 text-center">
            <FileSpreadsheet size={40} className="mx-auto text-[#3B2617] animate-pulse" />
            <p className="text-sm text-[#7C6354]">Importando pedidos...</p>
            <Progress value={importProgress} className="h-2" />
            <p className="text-xs text-[#9B8578]">{importProgress}%</p>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && importResult && (
          <div className="py-8 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#D1FAE5] flex items-center justify-center mx-auto">
              <Check size={32} className="text-[#065F46]" />
            </div>
            <h3 className="font-display text-lg text-[#3B2617]">Importación completada</h3>
            <div className="flex justify-center gap-4 text-sm">
              <span className="px-3 py-1.5 rounded-full bg-[#D1FAE5] text-[#065F46] font-semibold">✓ {importResult.imported} importados</span>
              {importResult.errors > 0 && <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 font-semibold">✗ {importResult.errors} errores</span>}
            </div>
            <Button onClick={() => { resetState(); onOpenChange(false); }} className="bg-[#3B2617] hover:bg-[#3B2617]/90 text-white">
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
