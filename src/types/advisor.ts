export interface BusinessInsight {
  id?: string;
  category: 'revenue' | 'products' | 'customers' | 'operations' | 'growth' | 'risk';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_label?: string;
  action_route?: string;
  data_snapshot?: Record<string, any>;
  insight_type: 'alert' | 'suggestion' | 'trend' | 'opportunity' | 'warning';
}

export interface AnalysisContext {
  orders: any[];
  products: any[];
  productVariants: any[];
  contactMessages: any[];
  now: Date;
}
