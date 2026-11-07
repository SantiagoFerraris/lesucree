import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import ExcelImportModal from './ExcelImportModal';

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => {
    if (table !== 'orders') throw new Error(`Unexpected table: ${table}`);
    return { insert };
  } },
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function workbookFile(bookType: 'xlsx' | 'biff8' | 'csv') {
  const header = ['Encargue', 'Entrega', 'Hora', 'Producto', 'Tamaño', '', 'Seña', 'Fecha seña', 'Saldo', '', 'Precio', 'Pago', 'Cliente', 'Contacto', 'Estado'];
  const row = (name: string, product: string, status: string) => [
    '13/11/26', '14/11/2026', bookType === 'csv' ? 'A coordinar' : '15:00', product, 'Grande', '', bookType === 'csv' ? 5000 : '$5.000,00',
    '13/11/26', bookType === 'csv' ? 5000 : '$5.000,00', '', bookType === 'csv' ? 10000 : '$10.000,00', 'Transferencia', name, '3415551234', status,
  ];
  const workbook = XLSX.utils.book_new();
  const data = [['Pedidos noviembre'], header,
    row('Ana', 'Torta', 'Confirmado'),
    row('Bea', 'Budín', 'Entregado'),
    row('Carla', 'Alfajor', 'Pendiente'),
    row('', 'Pavlova', 'Pendiente'),
  ];
  if (bookType === 'xlsx') {
    // The importer must choose the ventas sheet rather than the first sheet.
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Ignore this sheet']]), 'Notas');
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), bookType === 'biff8' ? 'Pedidos' : 'Ventas noviembre');
  const bytes = XLSX.write(workbook, { bookType, type: 'array' });
  const extension = bookType === 'biff8' ? 'xls' : bookType;
  return new File([new Uint8Array(bytes).buffer], `orders.${extension}`);
}

describe('Excel import compatibility with maintained SheetJS', () => {
  it.each(['xlsx', 'biff8', 'csv'] as const)('preserves parsing and import eligibility for %s', async bookType => {
    insert.mockResolvedValue({ error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { container, unmount } = render(
      <QueryClientProvider client={client}>
        <ExcelImportModal open onOpenChange={() => {}} existingOrders={[
          { customer_name: 'CARLA', desired_date: '2026-11-14', items: [{ productName: 'ALFAJOR' }] },
        ]} />
      </QueryClientProvider>,
    );
    const input = container.ownerDocument.querySelector('input[type="file"]');
    if (!input) throw new Error('File input not rendered');
    fireEvent.change(input, { target: { files: [workbookFile(bookType)] } });
    fireEvent.click(await screen.findByRole('button', { name: /Continuar/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Importar 1 pedidos' }));
    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(insert.mock.calls[0]?.[0]).toEqual([expect.objectContaining({
      customer_name: 'Ana', customer_phone: '3415551234', desired_date: '2026-11-14',
      preferred_time: bookType === 'csv' ? 'A coordinar' : '15:00', total: 10000, status: 'confirmed', payment_status: 'seña_recibida',
      items: [{ productName: 'Torta', variantLabel: 'Grande', quantity: 1 }],
      notes: '[Importado desde Excel] | Forma de pago: Transferencia | Seña: $5000 (13/11/2026) | Saldo: $5000 | Contacto: 3415551234',
    })]);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Importar 1 pedidos' })).toBeNull());
    unmount();
    client.clear();
  });
});