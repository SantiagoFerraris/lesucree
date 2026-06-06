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

// Brand palette — warm cream / artisan
const CREAM_BG: [number, number, number] = [253, 250, 246];   // #FDFAF6
const ESPRESSO: [number, number, number] = [61, 32, 16];       // #3D2010
const COCOA: [number, number, number] = [92, 61, 30];          // #5C3D1E
const TOFFEE: [number, number, number] = [107, 68, 35];        // #6B4423
const TAUPE: [number, number, number] = [139, 112, 85];        // #8B7055
const SAND: [number, number, number] = [160, 130, 109];        // #A0826D
const GOLD_LINE: [number, number, number] = [201, 168, 130];   // #C9A882
const FOOT_LINE: [number, number, number] = [224, 212, 196];   // #E0D4C4
const ROW_LINE: [number, number, number] = [237, 227, 216];    // #EDE3D8

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
        .select('id, product_id, label, price')
        .order('sort_order');
      if (error) throw error;
      return data as Variant[];
    },
  });

  const isProductExportable = (p: Product) => {
    if (INTERNAL_CATS.includes(p.category)) return true;
    return p.active === true || p.status === 'active';
  };

  const exportableProducts = useMemo(() => products.filter(isProductExportable), [products]);

  const countByCat = useMemo(() => {
    const m: Record<string, number> = {};
    exportableProducts.forEach(p => { m[p.category] = (m[p.category] || 0) + 1; });
    return m;
  }, [exportableProducts]);

  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
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
      const MARGIN_X = 48;
      const MARGIN_TOP = 40;
      const MARGIN_BOTTOM = 40;
      const CONTENT_W = pageW - MARGIN_X * 2;

      // Group products by category
      const grouped: Record<string, Product[]> = {};
      productsToExport.forEach(p => {
        (grouped[p.category] ||= []).push(p);
      });
      const orderedCats = Object.keys(grouped).sort((a, b) => {
        const sa = categories.find(c => c.value === a)?.sort_order ?? 999;
        const sb = categories.find(c => c.value === b)?.sort_order ?? 999;
        return sa - sb;
      });

      // Pre-load logo + product images
      const logoData = await loadImageAsDataURL(logoAsset.url);
      const imgMap: Record<string, string | null> = {};
      await Promise.all(productsToExport.map(async p => {
        if (p.image_url) imgMap[p.id] = await loadImageAsDataURL(p.image_url);
      }));

      // Paint cream background on a page
      const paintBg = () => {
        doc.setFillColor(...CREAM_BG);
        doc.rect(0, 0, pageW, pageH, 'F');
      };

      // Ornamental divider: ——— ◆ ———
      const drawDivider = (cy: number, totalWidth = 120) => {
        const halfLine = (totalWidth - 14) / 2;
        const cx = pageW / 2;
        doc.setDrawColor(...GOLD_LINE);
        doc.setLineWidth(0.5);
        doc.line(cx - totalWidth / 2, cy, cx - 7, cy);
        doc.line(cx + 7, cy, cx + totalWidth / 2, cy);
        // diamond
        doc.setFillColor(...GOLD_LINE);
        const s = 3;
        doc.triangle(cx, cy - s, cx + s, cy, cx, cy + s, 'F');
        doc.triangle(cx, cy - s, cx - s, cy, cx, cy + s, 'F');
        void halfLine;
      };

      // Letter-spaced text (jsPDF has no native letter-spacing)
      const drawSpacedText = (
        text: string,
        cx: number,
        cy: number,
        spacing: number,
      ) => {
        const chars = text.split('');
        const widths = chars.map(ch => doc.getTextWidth(ch));
        const total = widths.reduce((s, w) => s + w, 0) + spacing * (chars.length - 1);
        let x = cx - total / 2;
        chars.forEach((ch, i) => {
          doc.text(ch, x, cy);
          x += widths[i] + spacing;
        });
      };

      paintBg();
      let y = MARGIN_TOP;

      // === HEADER (page 1 only) ===
      const headerTop = 40;
      // Logo centered, 100px wide
      if (logoData) {
        try { doc.addImage(logoData, 'PNG', pageW / 2 - 50, headerTop, 100, 100); } catch { /* ignore */ }
      }
      // Brand name
      doc.setFont('times', 'normal');
      doc.setFontSize(24);
      doc.setTextColor(...ESPRESSO);
      drawSpacedText('LE SUCRÉE', pageW / 2, headerTop + 100 + 14 + 18, 6);

      // Tagline
      doc.setFont('times', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(...SAND);
      drawSpacedText('Pastelería Artesanal', pageW / 2, headerTop + 100 + 14 + 18 + 18, 3);

      // Ornamental divider
      const divY = headerTop + 100 + 14 + 18 + 18 + 16;
      drawDivider(divY);

      // Catalog title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COCOA);
      drawSpacedText('CATÁLOGO DE PRODUCTOS', pageW / 2, divY + 22, 6);

      y = divY + 22 + 28;

      // === Layout primitives ===
      const FOOTER_RESERVE = MARGIN_BOTTOM + 22;

      const newPage = () => {
        doc.addPage();
        paintBg();
        y = MARGIN_TOP;
      };

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - FOOTER_RESERVE) newPage();
      };

      // === CATEGORY HEADER (inline divider) ===
      const drawCategoryHeader = (label: string) => {
        ensureSpace(28 + 16);
        y += 28;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(107, 68, 35); // TOFFEE
        // Measure spaced text width
        const text = label.toUpperCase();
        const chars = text.split('');
        const spacing = 5;
        const charWidths = chars.map(ch => doc.getTextWidth(ch));
        const textW = charWidths.reduce((s, w) => s + w, 0) + spacing * (chars.length - 1);
        const cx = pageW / 2;
        // Lines
        const lineGap = 12;
        const lineLen = (CONTENT_W - textW) / 2 - lineGap;
        doc.setDrawColor(...GOLD_LINE);
        doc.setLineWidth(0.5);
        doc.line(MARGIN_X, y, MARGIN_X + lineLen, y);
        doc.line(pageW - MARGIN_X - lineLen, y, pageW - MARGIN_X, y);
        // Text (vertically centered on line)
        let x = cx - textW / 2;
        chars.forEach((ch, i) => {
          doc.text(ch, x, y + 3);
          x += charWidths[i] + spacing;
        });
        y += 16;
      };

      // === PRODUCT ROW ===
      const drawProductRow = (p: Product, isLastInCat: boolean) => {
        const IMG = 80;
        const PAD_V = 14;
        const TX = MARGIN_X + IMG + 16;
        const TW = pageW - MARGIN_X - TX;
        const pv = variants.filter(v => v.product_id === p.id);

        // Compute height
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        const nameLines = doc.splitTextToSize(p.name, TW) as string[];
        const nameH = nameLines.length * 15;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const descLines = p.description ? (doc.splitTextToSize(p.description, TW) as string[]).slice(0, 3) : [];
        const descH = descLines.length * 13;

        // Variants or single price
        let priceBlockH = 0;
        if (pv.length === 0) {
          priceBlockH = 20;
        } else {
          priceBlockH = pv.length * 14 + 4;
        }

        const innerH = nameH + 4 + descH + 6 + priceBlockH;
        const rowH = Math.max(IMG, innerH) + PAD_V * 2;

        ensureSpace(rowH);

        const rowTop = y;
        const imgY = rowTop + PAD_V;
        const img = imgMap[p.id];
        // Image (or placeholder)
        if (img) {
          try {
            const fmt = img.includes('image/png') ? 'PNG' : 'JPEG';
            doc.addImage(img, fmt as any, MARGIN_X, imgY, IMG, IMG);
          } catch {
            doc.setFillColor(...ROW_LINE);
            doc.roundedRect(MARGIN_X, imgY, IMG, IMG, 3, 3, 'F');
          }
        } else {
          doc.setFillColor(...ROW_LINE);
          doc.roundedRect(MARGIN_X, imgY, IMG, IMG, 3, 3, 'F');
        }

        // Text block
        let ty = rowTop + PAD_V + 12;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...ESPRESSO);
        nameLines.forEach(line => { doc.text(line, TX, ty); ty += 15; });
        ty += 2;

        if (descLines.length) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(...TAUPE);
          descLines.forEach(line => { doc.text(line, TX, ty); ty += 13; });
          ty += 4;
        }

        // Pricing
        if (pv.length === 0) {
          doc.setFont('times', 'normal');
          doc.setFontSize(14);
          doc.setTextColor(...TOFFEE);
          doc.text(formatPrice(Number(p.price)), TX, ty + 4);
        } else {
          const VAR_INDENT = TX + 12;
          const VAR_RIGHT = pageW - MARGIN_X;
          pv.forEach(v => {
            // Variant name
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(...TAUPE);
            doc.text(v.label, VAR_INDENT, ty);
            const labelW = doc.getTextWidth(v.label);

            // Price
            doc.setFont('times', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(...TOFFEE);
            const priceStr = formatPrice(Number(v.price));
            const priceW = doc.getTextWidth(priceStr);
            const priceX = VAR_RIGHT - priceW;
            doc.text(priceStr, priceX, ty);

            // Dot leaders
            const leaderStart = VAR_INDENT + labelW + 4;
            const leaderEnd = priceX - 4;
            if (leaderEnd > leaderStart) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(11);
              doc.setTextColor(...GOLD_LINE);
              const dotW = doc.getTextWidth('.');
              const gap = dotW * 1.6;
              let dx = leaderStart;
              while (dx + dotW <= leaderEnd) {
                doc.text('.', dx, ty);
                dx += gap;
              }
            }
            ty += 14;
          });
        }

        y = rowTop + rowH;

        // Fine separator between products
        if (!isLastInCat) {
          doc.setDrawColor(...ROW_LINE);
          doc.setLineWidth(0.5);
          doc.line(MARGIN_X, y, pageW - MARGIN_X, y);
        }
      };

      // === RENDER CATEGORIES ===
      for (const cat of orderedCats) {
        drawCategoryHeader(categoryLabel(cat));
        const list = grouped[cat];
        list.forEach((p, idx) => drawProductRow(p, idx === list.length - 1));
      }

      // === FOOTERS on every page ===
      const drawFooter = (pageNum: number, totalPages: number) => {
        const fy = pageH - MARGIN_BOTTOM + 8;
        doc.setDrawColor(...FOOT_LINE);
        doc.setLineWidth(0.5);
        doc.line(MARGIN_X, fy - 14, pageW - MARGIN_X, fy - 14);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...SAND);
        doc.text('Le Sucrée Pastelería Artesanal', MARGIN_X, fy);
        doc.text(`Página ${pageNum} de ${totalPages}`, pageW / 2, fy, { align: 'center' });
        doc.text('lesucreepasteleria.com.ar', pageW - MARGIN_X, fy, { align: 'right' });
      };

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
