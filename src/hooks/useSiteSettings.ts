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
      const url = `${supabaseUrl}/storage/v1/object/public/site-images/hero/hero-bg.jpg`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
          return `${url}?t=${Date.now()}`;
        }
      } catch {
        // Fall through
      }
      return null;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
