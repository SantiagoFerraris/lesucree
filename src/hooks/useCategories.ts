import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  value: string;
  label: string;
  sort_order: number;
  visible: boolean;
  created_at: string;
}

/** Fetch all categories ordered by sort_order */
export function useCategories(onlyVisible = false) {
  return useQuery<Category[]>({
    queryKey: ['categories', { onlyVisible }],
    queryFn: async () => {
      let q = supabase.from('categories').select('*').order('sort_order');
      if (onlyVisible) q = q.eq('visible', true);
      const { data, error } = await q;
      if (error) throw error;
      return data as Category[];
    },
  });
}

/** Build a label map from categories array */
export function buildCategoryLabels(categories: Category[] | undefined): Record<string, string> {
  if (!categories) return {};
  return Object.fromEntries(categories.map(c => [c.value, c.label]));
}
