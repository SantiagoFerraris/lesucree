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
      // Check if hero image exists in storage
      const { data } = await supabase.storage.from('site-images').list('hero');
      const heroFile = data?.find(f => f.name.startsWith('hero-bg'));
      if (heroFile) {
        const { data: urlData } = supabase.storage.from('site-images').getPublicUrl(`hero/${heroFile.name}`);
        return `${urlData.publicUrl}?t=${heroFile.updated_at}`;
      }
      return null; // Will fall back to default
    },
    staleTime: 60 * 1000,
  });
}
