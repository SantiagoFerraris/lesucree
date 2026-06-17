import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettings {
  [key: string]: string;
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value');
      if (error) throw error;
      const settings: SiteSettings = {};
      data?.forEach((row: any) => {
        settings[row.key] = row.value || '';
      });
      return settings;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useHeroImageUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return useQuery({
    queryKey: ['hero-image-url'],
    queryFn: async () => {
      return `${supabaseUrl}/storage/v1/object/public/site-images/hero/hero-bg.jpg`;
    },
    staleTime: 7 * 24 * 60 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useHistoriaImageUrl() {
  return useQuery({
    queryKey: ['historia-image-url'],
    queryFn: async () => {
      const { data } = await supabase.storage.from('site-images').list('historia');
      const file = data?.find(f => f.name.startsWith('historia-bg'));
      if (!file) return null;
      const { data: urlData } = supabase.storage.from('site-images').getPublicUrl(`historia/${file.name}`);
      return `${urlData.publicUrl}?t=${file.updated_at}`;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
