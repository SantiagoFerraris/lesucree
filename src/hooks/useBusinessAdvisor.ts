import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { runFullAnalysis } from '@/lib/businessAdvisor';
import type { BusinessInsight, AnalysisContext } from '@/types/advisor';

export function useBusinessAdvisor() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: insights, isLoading } = useQuery({
    queryKey: ['business-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_insights')
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false }) as any;
      if (error) throw error;
      return (data || []) as (BusinessInsight & { id: string; created_at: string; is_read: boolean })[];
    },
  });

  const runAnalysis = useCallback(async () => {
    setRunning(true);
    const start = Date.now();
    try {
      const [ordersRes, productsRes, variantsRes, messagesRes] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('products').select('*'),
        supabase.from('product_variants').select('*'),
        supabase.from('contact_messages').select('*'),
      ]);

      const ctx: AnalysisContext = {
        orders: ordersRes.data || [],
        products: productsRes.data || [],
        productVariants: variantsRes.data || [],
        contactMessages: messagesRes.data || [],
        now: new Date(),
      };

      const newInsights = runFullAnalysis(ctx);

      // Clean old insights (>7 days)
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      await (supabase.from('business_insights').delete() as any).lt('created_at', weekAgo);

      // Check for duplicates and insert new
      const existing = insights || [];
      let inserted = 0;
      for (const insight of newInsights) {
        const isDuplicate = existing.some(e =>
          e.title === insight.title && new Date(e.created_at).getTime() > Date.now() - 3 * 86400000
        );
        if (!isDuplicate) {
          await (supabase.from('business_insights').insert({
            category: insight.category,
            priority: insight.priority,
            title: insight.title,
            description: insight.description,
            action_label: insight.action_label || null,
            action_route: insight.action_route || null,
            data_snapshot: insight.data_snapshot || null,
            insight_type: insight.insight_type,
          }) as any);
          inserted++;
        }
      }

      // Log the run
      await (supabase.from('advisor_run_log').insert({
        insights_generated: inserted,
        duration_ms: Date.now() - start,
      }) as any);

      qc.invalidateQueries({ queryKey: ['business-insights'] });
    } catch (err) {
      console.error('Advisor error:', err);
      await (supabase.from('advisor_run_log').insert({
        insights_generated: 0,
        duration_ms: Date.now() - start,
        error: String(err),
      }) as any);
    } finally {
      setRunning(false);
    }
  }, [insights, qc]);

  const dismissInsight = useCallback(async (id: string) => {
    await (supabase.from('business_insights').update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
    }) as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['business-insights'] });
  }, [qc]);

  const markAsRead = useCallback(async (id: string) => {
    await (supabase.from('business_insights').update({
      is_read: true,
      read_at: new Date().toISOString(),
    }) as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['business-insights'] });
  }, [qc]);

  return { insights: insights || [], isLoading, running, runAnalysis, dismissInsight, markAsRead };
}
