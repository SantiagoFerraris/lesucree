import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
] as const;

export default function AdminConfiguracion() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [heroUploading, setHeroUploading] = useState(false);
  const [historiaUploading, setHistoriaUploading] = useState(false);

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
        </div>
      </div>
    </div>
  );
}
