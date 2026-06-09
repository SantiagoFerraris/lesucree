import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Upload, Image as ImageIcon, Trash2, Plus, Pencil, ArrowUp, ArrowDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import pistachoImg from '@/assets/torta_2_pistacho_chocolate_blanco.jpg';
import pavlovaImg from '@/assets/torta_3_pavlova.jpg';
import petitFoursImg from '@/assets/torta_4_petit_fours.jpg';
import dulceDeLecheImg from '@/assets/torta_5_dulce_de_leche.jpg';
import cookiesImg from '@/assets/torta_6_cookies.jpg';
import chocolateAvellanasImg from '@/assets/torta_7_chocolate_avellanas.jpg';

const INSTAGRAM_ASSET_MIGRATION: { asset: string; filename: string; post_url: string; alt: string }[] = [
  { asset: pistachoImg, filename: 'pistacho.jpg', post_url: 'https://www.instagram.com/p/DUYvpAVD-q4/', alt: 'Tarta de pistacho y chocolate blanco' },
  { asset: pavlovaImg, filename: 'pavlova.jpg', post_url: 'https://www.instagram.com/p/DL-jG6ouV9X/', alt: 'Pavlova con frutos rojos' },
  { asset: petitFoursImg, filename: 'petit-fours.jpg', post_url: 'https://www.instagram.com/p/DL28Z_su87D/', alt: 'Box de petit fours surtidos' },
  { asset: dulceDeLecheImg, filename: 'dulce-de-leche.jpg', post_url: 'https://www.instagram.com/p/DA_QwEkx3DB/', alt: 'Torre de panqueques con dulce de leche' },
  { asset: cookiesImg, filename: 'cookies.jpg', post_url: 'https://www.instagram.com/p/DLGJCt_OYhk/', alt: 'Cookies artesanales con pistachos' },
  { asset: chocolateAvellanasImg, filename: 'chocolate-avellanas.jpg', post_url: 'https://www.instagram.com/p/C-BPlNlP3CG/', alt: 'Tarta de chocolate con avellanas' },
];

const SETTING_FIELDS = [
  { key: 'business_name', label: 'Nombre del negocio', placeholder: 'Le Sucrée' },
  { key: 'whatsapp_number', label: 'Número de WhatsApp', placeholder: '5493412741229' },
  { key: 'address', label: 'Dirección', placeholder: 'Rosario, Santa Fe, Argentina' },
  { key: 'alias', label: 'Alias de pago (transferencia)', placeholder: 'lesucree.mp', required: true },
  { key: 'pickup_address', label: 'Dirección de retiro', placeholder: 'Calle 123, Rosario, Santa Fe', required: true },
  { key: 'business_hours', label: 'Horarios', placeholder: 'Mañana: 9:00 - 12:00 / Tarde: 12:00 - 18:00' },
  { key: 'hero_title', label: 'Título del Hero', placeholder: 'Le Sucrée' },
  { key: 'hero_subtitle', label: 'Subtítulo del Hero', placeholder: 'Pastelería' },
  { key: 'hero_text', label: 'Texto del Hero', placeholder: 'Endulzamos tus momentos...', multiline: true },
  { key: 'instagram_url', label: 'URL de Instagram', placeholder: 'https://www.instagram.com/...' },
  { key: 'instagram_handle', label: 'Handle de Instagram', placeholder: '@pasteleria.lesucree' },
  // Payment configuration
  { key: 'pago_alias', label: 'Alias de pago (sistema seña)', placeholder: 'lesucree.mp' },
  { key: 'cbu_pago', label: 'CBU para transferencias', placeholder: '0000003100000000000000' },
  { key: 'direccion_retiro', label: 'Dirección de retiro (seña)', placeholder: 'Catamarca 1473, 1° B' },
  { key: 'horarios', label: 'Horarios (seña)', placeholder: 'Mañana: 9:00 - 12:00 / Tarde: 14:00 - 19:00' },
  { key: 'min_deposit_percentage', label: 'Mínimo de seña (%)', placeholder: '30', numeric: true },
  { key: 'max_deposit_percentage', label: 'Máximo de seña (%)', placeholder: '70', numeric: true },
  { key: 'dias_vencimiento', label: 'Días antes de vencer', placeholder: '3', numeric: true },
  { key: 'footer_phone_display', label: 'Teléfono visible en footer', placeholder: '+54 9 341 274-1229' },
  { key: 'footer_address', label: 'Dirección visible en footer', placeholder: 'Rosario, Santa Fe' },
  { key: 'payment_methods', label: 'Medios de pago (separados por coma)', placeholder: 'Mercado Pago, Transferencia, Efectivo' },
] as const;

export default function AdminConfiguracion() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [heroUploading, setHeroUploading] = useState(false);
  const [historiaUploading, setHistoriaUploading] = useState(false);
  const [historiaDeletando, setHistoriaDeletando] = useState(false);

  // FAQ admin state
  type FaqRow = { id: string; question: string; answer: string; sort_order: number; is_active: boolean };
  const [faqEditing, setFaqEditing] = useState<Partial<FaqRow> | null>(null);
  const [faqSaving, setFaqSaving] = useState(false);

  const { data: faqs, refetch: refetchFaqs } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as FaqRow[];
    },
  });

  const invalidateFaqs = () => {
    refetchFaqs();
    qc.invalidateQueries({ queryKey: ['faqs'] });
  };

  const handleFaqSave = async () => {
    if (!faqEditing) return;
    const question = (faqEditing.question || '').trim();
    const answer = (faqEditing.answer || '').trim();
    if (!question || !answer) {
      toast.error('La pregunta y la respuesta son obligatorias');
      return;
    }
    setFaqSaving(true);
    try {
      if (faqEditing.id) {
        const { error } = await supabase
          .from('faqs')
          .update({
            question,
            answer,
            is_active: faqEditing.is_active ?? true,
          })
          .eq('id', faqEditing.id);
        if (error) throw error;
        toast.success('Pregunta actualizada');
      } else {
        const maxOrder = (faqs ?? []).reduce((m, f) => Math.max(m, f.sort_order), -1);
        const { error } = await supabase
          .from('faqs')
          .insert({
            question,
            answer,
            sort_order: maxOrder + 1,
            is_active: faqEditing.is_active ?? true,
          });
        if (error) throw error;
        toast.success('Pregunta agregada');
      }
      setFaqEditing(null);
      invalidateFaqs();
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar la pregunta');
    } finally {
      setFaqSaving(false);
    }
  };

  const handleFaqDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    const { error } = await supabase.from('faqs').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Pregunta eliminada');
    invalidateFaqs();
  };

  const handleFaqToggleActive = async (row: FaqRow) => {
    const { error } = await supabase
      .from('faqs')
      .update({ is_active: !row.is_active })
      .eq('id', row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidateFaqs();
  };

  const handleFaqMove = async (row: FaqRow, dir: -1 | 1) => {
    const list = (faqs ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const idx = list.findIndex(f => f.id === row.id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
    const other = list[swapIdx];
    const { error: e1 } = await supabase
      .from('faqs')
      .update({ sort_order: other.sort_order })
      .eq('id', row.id);
    const { error: e2 } = await supabase
      .from('faqs')
      .update({ sort_order: row.sort_order })
      .eq('id', other.id);
    if (e1 || e2) {
      toast.error((e1 || e2)!.message);
      return;
    }
    invalidateFaqs();
  };

  // Instagram admin state
  type IgRow = { id: string; image_url: string; post_url: string; alt_text: string | null; sort_order: number; is_active: boolean };
  const [igEditing, setIgEditing] = useState<{ post_url: string; alt_text: string; is_active: boolean } | null>(null);
  const [igFile, setIgFile] = useState<File | null>(null);
  const [igSaving, setIgSaving] = useState(false);

  const { data: igPosts, refetch: refetchIg } = useQuery({
    queryKey: ['admin-instagram-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_posts')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as IgRow[];
    },
  });

  const invalidateIg = () => {
    refetchIg();
    qc.invalidateQueries({ queryKey: ['instagram-posts'] });
  };

  const handleIgSave = async () => {
    if (!igEditing) return;
    if (!igFile) {
      toast.error('Seleccioná una imagen');
      return;
    }
    if (!igEditing.post_url.trim()) {
      toast.error('Falta el link al post');
      return;
    }
    setIgSaving(true);
    try {
      const { resizeImageBeforeUpload } = await import('@/lib/imageUtils');
      const optimizedFile = await resizeImageBeforeUpload(igFile, 1200);
      const safeName = igFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `instagram/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('site-images')
        .upload(path, optimizedFile, { upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('site-images').getPublicUrl(path);
      const maxOrder = (igPosts ?? []).reduce((m, p) => Math.max(m, p.sort_order), -1);
      const { error } = await supabase.from('instagram_posts').insert({
        image_url: urlData.publicUrl,
        post_url: igEditing.post_url.trim(),
        alt_text: igEditing.alt_text.trim() || null,
        sort_order: maxOrder + 1,
        is_active: igEditing.is_active,
      });
      if (error) throw error;
      toast.success('Foto agregada');
      setIgEditing(null);
      setIgFile(null);
      invalidateIg();
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar la foto');
    } finally {
      setIgSaving(false);
    }
  };

  const handleIgDelete = async (row: IgRow) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    const { error } = await supabase.from('instagram_posts').delete().eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    // Best-effort delete of stored file
    try {
      const marker = '/site-images/';
      const idx = row.image_url.indexOf(marker);
      if (idx >= 0) {
        const path = row.image_url.slice(idx + marker.length).split('?')[0];
        await supabase.storage.from('site-images').remove([path]);
      }
    } catch { /* noop */ }
    toast.success('Foto eliminada');
    invalidateIg();
  };

  const handleIgToggleActive = async (row: IgRow) => {
    const { error } = await supabase
      .from('instagram_posts')
      .update({ is_active: !row.is_active })
      .eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    invalidateIg();
  };

  const handleIgMove = async (row: IgRow, dir: -1 | 1) => {
    const list = (igPosts ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const idx = list.findIndex(p => p.id === row.id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
    const other = list[swapIdx];
    const { error: e1 } = await supabase.from('instagram_posts').update({ sort_order: other.sort_order }).eq('id', row.id);
    const { error: e2 } = await supabase.from('instagram_posts').update({ sort_order: row.sort_order }).eq('id', other.id);
    if (e1 || e2) { toast.error((e1 || e2)!.message); return; }
    invalidateIg();
  };

  const [igMigrating, setIgMigrating] = useState(false);
  const migrarFotosInstagram = async () => {
    setIgMigrating(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const item of INSTAGRAM_ASSET_MIGRATION) {
        try {
          const blob = await fetch(item.asset).then(r => r.blob());
          const path = `instagram/${item.filename}`;
          const { error: upErr } = await supabase.storage
            .from('site-images')
            .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from('site-images').getPublicUrl(path);
          const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
          const { error: updErr } = await supabase
            .from('instagram_posts')
            .update({ image_url: publicUrl })
            .eq('post_url', item.post_url);
          if (updErr) throw updErr;
          ok++;
        } catch (e) {
          console.error('Migration failed for', item.filename, e);
          fail++;
        }
      }
      if (fail === 0) toast.success(`Migración completa (${ok} fotos)`);
      else toast.error(`Migración parcial: ${ok} ok, ${fail} con error`);
      invalidateIg();
    } finally {
      setIgMigrating(false);
    }
  };




  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('key, value');
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = r.value || ''; });
      return map;
    },
  });

  // Hero image URL
  const { data: heroImageUrl, refetch: refetchHero } = useQuery({
    queryKey: ['admin-hero-image'],
    queryFn: async () => {
      const { data } = await supabase.storage.from('site-images').list('hero');
      const heroFile = data?.find(f => f.name.startsWith('hero-bg'));
      if (heroFile) {
        const { data: urlData } = supabase.storage.from('site-images').getPublicUrl(`hero/${heroFile.name}`);
        return `${urlData.publicUrl}?t=${heroFile.updated_at}`;
      }
      return null;
    },
  });
  // Historia image URL
  const { data: historiaImageUrl, refetch: refetchHistoria } = useQuery({
    queryKey: ['admin-historia-image'],
    queryFn: async () => {
      const { data } = await supabase.storage.from('site-images').list('historia');
      const file = data?.find(f => f.name.startsWith('historia-bg'));
      if (file) {
        const { data: urlData } = supabase.storage.from('site-images').getPublicUrl(`historia/${file.name}`);
        return `${urlData.publicUrl}?t=${file.updated_at}`;
      }
      return null;
    },
  });

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate deposit percentages
      const minPct = Number(form.min_deposit_percentage);
      const maxPct = Number(form.max_deposit_percentage);
      if (form.min_deposit_percentage && form.max_deposit_percentage) {
        if (isNaN(minPct) || isNaN(maxPct) || minPct < 0 || maxPct > 100 || minPct >= maxPct) {
          throw new Error('Los porcentajes de seña deben cumplir: 0 ≤ mínimo < máximo ≤ 100');
        }
      }
      for (const [key, value] of Object.entries(form)) {
        const { error } = await supabase
          .from('site_settings')
          .upsert({ key, value, updated_at: new Date().toISOString() } as any, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Configuración guardada');
      qc.invalidateQueries({ queryKey: ['site-settings'] });
      qc.invalidateQueries({ queryKey: ['admin-site-settings'] });
      qc.invalidateQueries({ queryKey: ['site-settings-payment-config'] });
      qc.invalidateQueries({ queryKey: ['payment-settings'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Error al guardar la configuración'),
  });

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Solo JPG, PNG o WebP'); return; }

    setHeroUploading(true);
    const { resizeImageBeforeUpload } = await import('@/lib/imageUtils');
    const optimizedFile = await resizeImageBeforeUpload(file, 1920);
    const path = `hero/hero-bg.jpg`;

    // Delete existing hero images
    const { data: existingFiles } = await supabase.storage.from('site-images').list('hero');
    if (existingFiles?.length) {
      await supabase.storage.from('site-images').remove(existingFiles.map(f => `hero/${f.name}`));
    }

    const { error } = await supabase.storage.from('site-images').upload(path, optimizedFile, { upsert: true });
    if (error) {
      toast.error(`Error al subir imagen: ${error.message}`);
      setHeroUploading(false);
      return;
    }

    toast.success('Imagen del hero actualizada');
    refetchHero();
    qc.invalidateQueries({ queryKey: ['hero-image-url'] });
    setHeroUploading(false);
  };

  const handleHistoriaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Solo JPG, PNG o WebP'); return; }

    setHistoriaUploading(true);
    const { resizeImageBeforeUpload } = await import('@/lib/imageUtils');
    const optimizedFile = await resizeImageBeforeUpload(file, 1920);
    const path = `historia/historia-bg.jpg`;

    const { data: existingFiles } = await supabase.storage.from('site-images').list('historia');
    if (existingFiles?.length) {
      await supabase.storage.from('site-images').remove(existingFiles.map(f => `historia/${f.name}`));
    }

    const { error } = await supabase.storage.from('site-images').upload(path, optimizedFile, { upsert: true });
    if (error) {
      toast.error(`Error al subir imagen: ${error.message}`);
      setHistoriaUploading(false);
      return;
    }

    toast.success('Imagen de Historia actualizada');
    refetchHistoria();
    qc.invalidateQueries({ queryKey: ['historia-image-url'] });
    setHistoriaUploading(false);
  };

  const handleHistoriaDelete = async () => {
    setHistoriaDeletando(true);
    const { data: existingFiles } = await supabase.storage.from('site-images').list('historia');
    if (existingFiles?.length) {
      await supabase.storage.from('site-images').remove(existingFiles.map(f => `historia/${f.name}`));
    }
    toast.success('Imagen de Historia eliminada');
    refetchHistoria();
    qc.invalidateQueries({ queryKey: ['historia-image-url'] });
    setHistoriaDeletando(false);
  };

  const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30';

  if (isLoading) return <p className="text-warm-gray">Cargando configuración...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-espresso">Configuración</h2>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 rounded-full bg-dusty-pink text-white px-5 py-2 text-sm font-semibold hover:bg-mauve transition-all active:scale-95 disabled:opacity-50"
        >
          <Save size={16} /> {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
        {/* Business info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-espresso uppercase tracking-wider">Información del negocio</h3>
          {SETTING_FIELDS.map(field => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">{field.label}</label>
              {('multiline' in field && field.multiline) ? (
                <textarea
                  value={form[field.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                  className={`${inputClass} min-h-[80px] resize-none`}
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  value={form[field.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                  className={inputClass}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        {/* Hero image */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-espresso uppercase tracking-wider">Imagen del Hero</h3>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            {heroImageUrl ? (
              <div className="rounded-lg overflow-hidden aspect-[21/9]">
                <img src={heroImageUrl} alt="Hero actual" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="rounded-lg bg-cream aspect-[21/9] flex items-center justify-center">
                <div className="text-center text-warm-gray/60">
                  <ImageIcon size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Sin imagen personalizada</p>
                  <p className="text-xs">Se usa la imagen por defecto</p>
                </div>
              </div>
            )}
            <label className={`flex items-center justify-center gap-2 rounded-full border-[1.5px] border-espresso text-espresso px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-espresso hover:text-white transition-all duration-300 active:scale-95 cursor-pointer ${heroUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload size={16} /> {heroUploading ? 'Subiendo...' : 'Subir nueva imagen'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleHeroUpload} className="hidden" />
            </label>
            <p className="text-xs text-warm-gray">Recomendado: foto horizontal, mínimo 1920x800px. JPG o PNG.</p>
          </div>

          {/* Historia image */}
          <h3 className="text-sm font-semibold text-espresso uppercase tracking-wider pt-4">Imagen de Historia</h3>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            {historiaImageUrl ? (
              <div className="rounded-lg overflow-hidden aspect-[21/9]">
                <img src={historiaImageUrl} alt="Historia actual" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="rounded-lg bg-cream aspect-[21/9] flex items-center justify-center">
                <div className="text-center text-warm-gray/60">
                  <ImageIcon size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Sin imagen personalizada</p>
                  <p className="text-xs">Se usa el fondo por defecto</p>
                </div>
              </div>
            )}
            {historiaImageUrl && (
              <button
                onClick={handleHistoriaDelete}
                disabled={historiaDeletando}
                className="flex items-center justify-center gap-2 w-full rounded-full border-[1.5px] border-red-300 text-red-400 px-5 py-2 text-sm font-semibold hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={15} />
                {historiaDeletando ? 'Eliminando...' : 'Quitar imagen (volver a fondo beige)'}
              </button>
            )}
            <label className={`flex items-center justify-center gap-2 rounded-full border-[1.5px] border-espresso text-espresso px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-espresso hover:text-white transition-all duration-300 active:scale-95 cursor-pointer ${historiaUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload size={16} /> {historiaUploading ? 'Subiendo...' : 'Subir nueva imagen'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleHistoriaUpload} className="hidden" />
            </label>
            <p className="text-xs text-warm-gray">Recomendado: foto horizontal, mínimo 1920x800px. JPG o PNG.</p>
          </div>
        </div>
      </div>

      {/* FAQ admin */}
      <div className="mt-12 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-espresso uppercase tracking-wider">Preguntas Frecuentes</h3>
          <button
            onClick={() =>
              setFaqEditing({ question: '', answer: '', is_active: true })
            }
            className="flex items-center gap-2 rounded-full bg-dusty-pink text-white px-4 py-2 text-xs font-semibold hover:bg-mauve transition-all active:scale-95"
          >
            <Plus size={14} /> Agregar pregunta
          </button>
        </div>

        {faqEditing && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-espresso">
                {faqEditing.id ? 'Editar pregunta' : 'Nueva pregunta'}
              </h4>
              <button
                onClick={() => setFaqEditing(null)}
                className="text-warm-gray hover:text-espresso"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Pregunta</label>
              <textarea
                value={faqEditing.question || ''}
                onChange={e => setFaqEditing(p => ({ ...p, question: e.target.value }))}
                className={`${inputClass} min-h-[60px] resize-none`}
                placeholder="¿Cuál es la pregunta?"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Respuesta</label>
              <textarea
                value={faqEditing.answer || ''}
                onChange={e => setFaqEditing(p => ({ ...p, answer: e.target.value }))}
                className={`${inputClass} min-h-[120px] resize-none`}
                placeholder="Respuesta..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-espresso">
              <input
                type="checkbox"
                checked={faqEditing.is_active ?? true}
                onChange={e => setFaqEditing(p => ({ ...p, is_active: e.target.checked }))}
              />
              Visible en el sitio
            </label>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleFaqSave}
                disabled={faqSaving}
                className="rounded-full bg-dusty-pink text-white px-5 py-2 text-sm font-semibold hover:bg-mauve transition-all active:scale-95 disabled:opacity-50"
              >
                {faqSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setFaqEditing(null)}
                className="rounded-full border border-gray-200 text-espresso px-5 py-2 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {(faqs ?? []).length === 0 && (
            <p className="text-sm text-warm-gray p-5">No hay preguntas todavía.</p>
          )}
          {(faqs ?? []).map((f, i, arr) => (
            <div key={f.id} className="flex items-center gap-3 p-4">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleFaqMove(f, -1)}
                  disabled={i === 0}
                  className="text-warm-gray hover:text-espresso disabled:opacity-30"
                  aria-label="Subir"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => handleFaqMove(f, 1)}
                  disabled={i === arr.length - 1}
                  className="text-warm-gray hover:text-espresso disabled:opacity-30"
                  aria-label="Bajar"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <span className="text-xs text-warm-gray w-6 text-center">{f.sort_order}</span>
              <p className="flex-1 text-sm text-espresso truncate">{f.question}</p>
              <label className="flex items-center gap-1 text-xs text-warm-gray">
                <input
                  type="checkbox"
                  checked={f.is_active}
                  onChange={() => handleFaqToggleActive(f)}
                />
                Activa
              </label>
              <button
                onClick={() => setFaqEditing(f)}
                className="text-warm-gray hover:text-espresso"
                aria-label="Editar"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleFaqDelete(f.id)}
                className="text-red-400 hover:text-red-600"
                aria-label="Eliminar"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Instagram admin */}
      <div className="mt-12 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-espresso uppercase tracking-wider">Instagram</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={migrarFotosInstagram}
              disabled={igMigrating}
              className="rounded-full border border-gray-200 text-espresso px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
            >
              {igMigrating ? 'Migrando...' : 'Migrar fotos desde assets (solo una vez)'}
            </button>
            <button
              onClick={() => { setIgEditing({ post_url: '', alt_text: '', is_active: true }); setIgFile(null); }}
              className="flex items-center gap-2 rounded-full bg-dusty-pink text-white px-4 py-2 text-xs font-semibold hover:bg-mauve transition-all active:scale-95"
            >
              <Plus size={14} /> Agregar foto
            </button>
          </div>
        </div>

        {igEditing && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-espresso">Nueva foto</h4>
              <button
                onClick={() => { setIgEditing(null); setIgFile(null); }}
                className="text-warm-gray hover:text-espresso"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Imagen</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={e => setIgFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-espresso"
              />
              {igFile && <p className="text-xs text-warm-gray mt-1">{igFile.name}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Link del post</label>
              <input
                value={igEditing.post_url}
                onChange={e => setIgEditing(p => p ? { ...p, post_url: e.target.value } : p)}
                className={inputClass}
                placeholder="https://www.instagram.com/p/..."
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Texto alternativo</label>
              <input
                value={igEditing.alt_text}
                onChange={e => setIgEditing(p => p ? { ...p, alt_text: e.target.value } : p)}
                className={inputClass}
                placeholder="Descripción de la foto"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-espresso">
              <input
                type="checkbox"
                checked={igEditing.is_active}
                onChange={e => setIgEditing(p => p ? { ...p, is_active: e.target.checked } : p)}
              />
              Visible en el sitio
            </label>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleIgSave}
                disabled={igSaving}
                className="rounded-full bg-dusty-pink text-white px-5 py-2 text-sm font-semibold hover:bg-mauve transition-all active:scale-95 disabled:opacity-50"
              >
                {igSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => { setIgEditing(null); setIgFile(null); }}
                className="rounded-full border border-gray-200 text-espresso px-5 py-2 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {(igPosts ?? []).length === 0 ? (
          <p className="text-sm text-warm-gray bg-white rounded-xl border border-gray-100 p-5">
            No hay fotos todavía.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(igPosts ?? []).map((p, i, arr) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="aspect-square bg-cream">
                  <img
                    src={p.image_url}
                    alt={p.alt_text || ''}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs text-espresso truncate" title={p.alt_text || ''}>
                    {p.alt_text || <span className="text-warm-gray italic">Sin descripción</span>}
                  </p>
                  <a
                    href={p.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-dusty-pink hover:text-mauve truncate"
                  >
                    {p.post_url}
                  </a>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleIgMove(p, -1)}
                        disabled={i === 0}
                        className="text-warm-gray hover:text-espresso disabled:opacity-30 p-1"
                        aria-label="Subir"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => handleIgMove(p, 1)}
                        disabled={i === arr.length - 1}
                        className="text-warm-gray hover:text-espresso disabled:opacity-30 p-1"
                        aria-label="Bajar"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-warm-gray">
                      <input
                        type="checkbox"
                        checked={p.is_active}
                        onChange={() => handleIgToggleActive(p)}
                      />
                      Activa
                    </label>
                    <button
                      onClick={() => handleIgDelete(p)}
                      className="text-red-400 hover:text-red-600 p-1"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
