import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/useCategories';
import { formatPrice } from '@/lib/formatPrice';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logoAsset from '@/assets/logo_lesucree_hd.png.asset.json';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  status: string | null;
  active: boolean | null;
}

interface Variant {
  id: string;
  product_id: string;
  label: string;
  price: number;
}

const INTERNAL_CATS = ['bares', 'bares_cookies'];

// Brand colors (web palette)
const BROWN_DARK: [number, number, number] = [59, 38, 23];   // #3B2617
const BROWN_MID: [number, number, number] = [139, 111, 71];   // #8B6F47
const BROWN_LIGHT: [number, number, number] = [160, 130, 109];// #A0826D
const CREAM: [number, number, number] = [255, 251, 245];      // #FFFBF5
const GRAY_TEXT: [number, number, number] = [102, 89, 79];

async function loadImageAsDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function AdminExportarProductos() {
  const { data: categories = [] } = useCategories();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['exportar-productos-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, category, image_url, status, active')
        .order('category')
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: variants = [] } = useQuery<Variant[]>({
    queryKey: ['exportar-variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, label, price');
      if (error) throw error;
      return data as Variant[];
    },
  });

  // Helper: is a product "available" (active for non-internal; any for internal)
  const isProductExportable = (p: Product) => {
    if (INTERNAL_CATS.includes(p.category)) return true;
    return p.active === true || p.status === 'active';
  };

  const exportableProducts = useMemo(() => products.filter(isProductExportable), [products]);

  // counts by category
  const countByCat = useMemo(() => {
    const m: Record<string, number> = {};
    exportableProducts.forEach(p => { m[p.category] = (m[p.category] || 0) + 1; });
    return m;
  }, [exportableProducts]);

  // ---- State: category mode ----
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());

  // ---- State: individual products mode ----
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('__all__');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exportableProducts.filter(p => {
      if (filterCat !== '__all__' && p.category !== filterCat) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exportableProducts, search, filterCat]);

  const [generating, setGenerating] = useState(false);

  const toggleCat = (val: string) => {
    setSelectedCats(prev => {
      const n = new Set(prev);
      n.has(val) ? n.delete(val) : n.add(val);
      return n;
    });
  };

  const toggleProduct = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const categoryLabel = (val: string) =>
    categories.find(c => c.value === val)?.label || val;

  // ---- PDF generation ----
  async function generatePDF(productsToExport: Product[]) {
    if (productsToExport.length === 0) {
      toast.error('Seleccioná al menos un producto o categoría');
      return;
    }

    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;

      // Group products by category
      const grouped: Record<string, Product[]> = {};
      productsToExport.forEach(p => {
        (grouped[p.category] ||= []).push(p);
      });

      // Sort categories by their sort_order
      const orderedCats = Object.keys(grouped).sort((a, b) => {
        const sa = categories.find(c => c.value === a)?.sort_order ?? 999;
        const sb = categories.find(c => c.value === b)?.sort_order ?? 999;
        return sa - sb;
      });

      // Pre-load logo
      const logoData = await loadImageAsDataURL(logoSrc);

      // Pre-load product images (in parallel, limit failures)
      const imgMap: Record<string, string | null> = {};
      await Promise.all(productsToExport.map(async p => {
        if (p.image_url) imgMap[p.id] = await loadImageAsDataURL(p.image_url);
      }));

      // === HEADER (page 1 only — cover) ===
      let y = margin;
      doc.setFillColor(...CREAM);
      doc.rect(0, 0, pageW, 160, 'F');

      if (logoData) {
        try { doc.addImage(logoData, 'PNG', pageW / 2 - 35, 25, 70, 70); } catch { /* ignore */ }
      }

      doc.setTextColor(...BROWN_DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('Le Sucrée', pageW / 2, 115, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(...BROWN_MID);
      doc.text('Pastelería Artesanal', pageW / 2, 132, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...BROWN_DARK);
      doc.text('CATÁLOGO DE PRODUCTOS', pageW / 2, 185, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRAY_TEXT);
      const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.text(`Generado el ${dateStr}`, pageW / 2, 202, { align: 'center' });
      doc.text('WhatsApp: +54 9 341 000 0000  ·  hola@lesucree.com.ar', pageW / 2, 216, { align: 'center' });

      y = 250;

      // === CATEGORY SECTIONS ===
      const ROW_H = 90;        // product card height
      const IMG_SIZE = 70;

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - 50) {
          doc.addPage();
          y = margin;
        }
      };

      const drawFooter = (pageNum: number, totalPages: number) => {
        const fy = pageH - 25;
        doc.setDrawColor(...BROWN_LIGHT);
        doc.setLineWidth(0.5);
        doc.line(margin, fy - 10, pageW - margin, fy - 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Le Sucrée Pastelería Artesanal  ·  lesucree.lovable.app', margin, fy);
        doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, fy, { align: 'right' });
      };

      for (const cat of orderedCats) {
        ensureSpace(60);

        // Category heading
        doc.setFillColor(...BROWN_DARK);
        doc.rect(margin, y, pageW - margin * 2, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(categoryLabel(cat).toUpperCase(), margin + 12, y + 19);
        y += 40;

        for (const p of grouped[cat]) {
          ensureSpace(ROW_H + 10);

          // Card background
          doc.setFillColor(...CREAM);
          doc.rect(margin, y, pageW - margin * 2, ROW_H, 'F');
          doc.setDrawColor(...BROWN_LIGHT);
          doc.setLineWidth(0.3);
          doc.rect(margin, y, pageW - margin * 2, ROW_H);

          // Image
          const imgX = margin + 10;
          const imgY = y + (ROW_H - IMG_SIZE) / 2;
          const img = imgMap[p.id];
          if (img) {
            try {
              const fmt = img.includes('image/png') ? 'PNG' : 'JPEG';
              doc.addImage(img, fmt as any, imgX, imgY, IMG_SIZE, IMG_SIZE);
            } catch {
              doc.setFillColor(230, 220, 210);
              doc.rect(imgX, imgY, IMG_SIZE, IMG_SIZE, 'F');
            }
          } else {
            doc.setFillColor(230, 220, 210);
            doc.rect(imgX, imgY, IMG_SIZE, IMG_SIZE, 'F');
          }

          // Text block
          const tx = imgX + IMG_SIZE + 15;
          const tw = pageW - margin - tx - 10;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...BROWN_DARK);
          doc.text(p.name, tx, y + 20, { maxWidth: tw });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...BROWN_MID);
          doc.text(formatPrice(Number(p.price)), tx, y + 38);

          // Description
          if (p.description) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...GRAY_TEXT);
            const lines = doc.splitTextToSize(p.description, tw);
            doc.text(lines.slice(0, 2), tx, y + 54);
          }

          // Variants
          const pv = variants.filter(v => v.product_id === p.id);
          if (pv.length > 0) {
            const vStr = 'Disponible en: ' + pv.map(v => v.label).join(' · ');
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(...BROWN_MID);
            const vLines = doc.splitTextToSize(vStr, tw);
            doc.text(vLines.slice(0, 1), tx, y + ROW_H - 10);
          }

          y += ROW_H + 8;
        }

        y += 10;
      }

      // === Add footers to all pages ===
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        drawFooter(i, total);
      }

      doc.save(`catalogo-lesucree-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generado correctamente');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  }

  const handleExportByCategory = () => {
    const list = exportableProducts.filter(p => selectedCats.has(p.category));
    generatePDF(list);
  };

  const handleExportIndividual = () => {
    const list = exportableProducts.filter(p => selectedIds.has(p.id));
    generatePDF(list);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-espresso flex items-center gap-2">
            <FileText size={22} /> Exportar Catálogo
          </h2>
          <p className="text-sm text-warm-gray mt-1">Generá PDFs profesionales para compartir con clientes.</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-warm-gray text-sm">Cargando productos...</p>
      ) : (
        <Tabs defaultValue="cat" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="cat">Por Categoría</TabsTrigger>
            <TabsTrigger value="ind">Por Producto Individual</TabsTrigger>
          </TabsList>

          {/* === CATEGORY MODE === */}
          <TabsContent value="cat">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 max-w-2xl">
              <h3 className="font-semibold text-espresso mb-4">Seleccioná categorías a exportar</h3>
              <div className="space-y-2 mb-6">
                {categories.map(c => {
                  const count = countByCat[c.value] || 0;
                  if (count === 0) return null;
                  return (
                    <label key={c.value} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-cream cursor-pointer">
                      <Checkbox
                        checked={selectedCats.has(c.value)}
                        onCheckedChange={() => toggleCat(c.value)}
                      />
                      <span className="flex-1 text-sm text-espresso font-medium">{c.label}</span>
                      <span className="text-xs text-warm-gray">{count} prod.</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setSelectedCats(new Set())}
                  className="text-xs text-warm-gray hover:text-espresso underline"
                >
                  Limpiar selección
                </button>
                <Button
                  onClick={handleExportByCategory}
                  disabled={generating || selectedCats.size === 0}
                  className="bg-espresso hover:bg-espresso/90 text-white"
                >
                  <Download size={16} className="mr-2" />
                  {generating ? 'Generando...' : 'Descargar como PDF'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* === INDIVIDUAL MODE === */}
          <TabsContent value="ind">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    className="pl-9"
                  />
                </div>
                <Select value={filterCat} onValueChange={setFilterCat}>
                  <SelectTrigger className="sm:w-64">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las categorías</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-warm-gray mb-2">
                {selectedIds.size} producto{selectedIds.size === 1 ? '' : 's'} seleccionado{selectedIds.size === 1 ? '' : 's'} · Mostrando {filteredProducts.length}
              </p>

              <div className="max-h-[480px] overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <p className="p-6 text-center text-sm text-warm-gray">Sin resultados</p>
                ) : (
                  filteredProducts.map(p => (
                    <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-cream cursor-pointer">
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggleProduct(p.id)}
                      />
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-blush" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-espresso truncate">{p.name}</p>
                        <p className="text-xs text-warm-gray">{categoryLabel(p.category)}</p>
                      </div>
                      <span className="text-sm font-semibold text-espresso whitespace-nowrap">{formatPrice(Number(p.price))}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="flex justify-between items-center mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-warm-gray hover:text-espresso underline"
                >
                  Limpiar selección
                </button>
                <Button
                  onClick={handleExportIndividual}
                  disabled={generating || selectedIds.size === 0}
                  className="bg-espresso hover:bg-espresso/90 text-white"
                >
                  <Download size={16} className="mr-2" />
                  {generating ? 'Generando...' : 'Descargar como PDF'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
