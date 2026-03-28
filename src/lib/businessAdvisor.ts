import type { BusinessInsight, AnalysisContext } from '@/types/advisor';
import { formatPrice } from '@/lib/formatPrice';

function daysAgo(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() - days); return d;
}

function monthStart(date: Date, offset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function parseItems(order: any): any[] {
  return Array.isArray(order.items) ? order.items : [];
}

function analyzeRevenueTrends(ctx: AnalysisContext): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const { orders, now } = ctx;
  const thisMonth = orders.filter(o => o.status === 'completed' && new Date(o.created_at) >= monthStart(now));
  const lastMonth = orders.filter(o => o.status === 'completed' && new Date(o.created_at) >= monthStart(now, -1) && new Date(o.created_at) < monthStart(now));
  const thisRev = thisMonth.reduce((s, o) => s + Number(o.total), 0);
  const lastRev = lastMonth.reduce((s, o) => s + Number(o.total), 0);

  if (lastRev > 0) {
    const pct = Math.round(((thisRev - lastRev) / lastRev) * 100);
    if (pct < -20) insights.push({ category: 'revenue', priority: 'critical', insight_type: 'alert', title: `📉 Ingresos bajaron ${Math.abs(pct)}%`, description: `Los ingresos bajaron un ${Math.abs(pct)}% respecto al mes anterior. Revisá si hubo cambios en el catálogo o si hay oportunidades de promoción.`, data_snapshot: { thisRev, lastRev, pct } });
    else if (pct < -5) insights.push({ category: 'revenue', priority: 'high', insight_type: 'warning', title: `Ingresos bajaron ${Math.abs(pct)}%`, description: `Los ingresos bajaron un ${Math.abs(pct)}% este mes. Puede ser estacional, pero vale la pena investigar.`, data_snapshot: { thisRev, lastRev, pct } });
    else if (pct > 15) insights.push({ category: 'revenue', priority: 'low', insight_type: 'trend', title: `🎉 Ingresos crecieron ${pct}%`, description: `¡Los ingresos crecieron un ${pct}% este mes! Lo que estás haciendo funciona.`, data_snapshot: { thisRev, lastRev, pct } });
  }

  const avgTicket = thisMonth.length > 0 ? thisRev / thisMonth.length : 0;
  const medianPrice = ctx.products.length > 0 ? ctx.products.map(p => Number(p.price)).sort((a, b) => a - b)[Math.floor(ctx.products.length / 2)] : 0;
  if (avgTicket > 0 && medianPrice > 0 && avgTicket < medianPrice * 0.8) {
    insights.push({ category: 'revenue', priority: 'medium', insight_type: 'suggestion', title: 'Ticket promedio bajo', description: `El ticket promedio (${formatPrice(avgTicket)}) es más bajo que tu precio típico. Considerá ofrecer combos o productos complementarios.`, data_snapshot: { avgTicket, medianPrice } });
  }
  return insights;
}

function analyzeProductPerformance(ctx: AnalysisContext): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const { orders, products, now } = ctx;
  const recent = orders.filter(o => o.status === 'completed' && new Date(o.created_at) >= daysAgo(now, 60));
  const salesMap: Record<string, number> = {};
  recent.forEach(o => parseItems(o).forEach((i: any) => { salesMap[i.productId] = (salesMap[i.productId] || 0) + (i.quantity || 1); }));

  const activeProducts = products.filter(p => p.active);
  const zeroSales = activeProducts.filter(p => !salesMap[p.id]);
  if (zeroSales.length > 0) {
    zeroSales.slice(0, 3).forEach(p => {
      insights.push({ category: 'products', priority: 'high', insight_type: 'warning', title: `"${p.name}" sin ventas`, description: `"${p.name}" no tuvo ningún pedido en 60 días. Considerá destacarlo, ajustar el precio, o desactivarlo temporalmente.`, action_label: 'Ver producto', action_route: '/admin/productos' });
    });
  }

  const sorted = Object.entries(salesMap).sort((a, b) => b[1] - a[1]);
  if (sorted.length >= 3) {
    const top3 = sorted.slice(0, 3).map(([id]) => products.find(p => p.id === id)?.name || 'Desconocido').join(', ');
    insights.push({ category: 'products', priority: 'low', insight_type: 'trend', title: '⭐ Productos estrella', description: `Tus productos estrella son: ${top3}. Asegurate de tener siempre disponibilidad.` });
  }

  sorted.slice(0, 5).forEach(([id]) => {
    const p = products.find(pr => pr.id === id);
    if (p && !p.featured) {
      insights.push({ category: 'products', priority: 'medium', insight_type: 'opportunity', title: `Destacar "${p.name}"`, description: `"${p.name}" se vende muy bien pero no está destacado en el inicio. Destacarlo podría impulsar aún más las ventas.`, action_label: 'Destacar producto', action_route: '/admin/productos' });
    }
  });

  return insights;
}

function analyzeCancellationRate(ctx: AnalysisContext): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const recent = ctx.orders.filter(o => new Date(o.created_at) >= daysAgo(ctx.now, 30));
  if (recent.length === 0) return insights;
  const cancelled = recent.filter(o => o.status === 'cancelled').length;
  const rate = Math.round((cancelled / recent.length) * 100);

  if (rate > 30) insights.push({ category: 'operations', priority: 'critical', insight_type: 'alert', title: `🚨 Cancelaciones al ${rate}%`, description: `La tasa de cancelación es del ${rate}%. Esto es muy alto. ¿Se confirman los pedidos a tiempo?`, action_label: 'Ver pedidos', action_route: '/admin/pedidos' });
  else if (rate > 15) insights.push({ category: 'operations', priority: 'high', insight_type: 'warning', title: `Cancelaciones al ${rate}%`, description: `El ${rate}% de los pedidos se cancelan. Enviar confirmaciones rápidas por WhatsApp podría reducir este número.` });
  else if (rate < 5) insights.push({ category: 'operations', priority: 'low', insight_type: 'trend', title: `✅ Cancelaciones bajas (${rate}%)`, description: `Tu tasa de cancelación es solo del ${rate}%. ¡Excelente gestión!` });
  return insights;
}

function analyzeCustomerRetention(ctx: AnalysisContext): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const { orders, now } = ctx;
  const customerMap: Record<string, any[]> = {};
  orders.forEach(o => { const k = o.customer_email; customerMap[k] = customerMap[k] || []; customerMap[k].push(o); });

  const total = Object.keys(customerMap).length;
  const repeat = Object.values(customerMap).filter(os => os.length > 1).length;
  const repeatRate = total > 0 ? Math.round((repeat / total) * 100) : 0;

  if (repeatRate < 20 && total > 5) {
    insights.push({ category: 'customers', priority: 'high', insight_type: 'suggestion', title: `Retención baja (${repeatRate}%)`, description: `Solo el ${repeatRate}% de tus clientes vuelve a pedir. Un mensaje de agradecimiento o un descuento podría mejorar esto.`, action_label: 'Ver clientes', action_route: '/admin/clientes' });
  }

  const dormant = Object.entries(customerMap).filter(([, os]) => os.length > 1 && new Date(Math.max(...os.map(o => new Date(o.created_at).getTime()))) < daysAgo(now, 30));
  if (dormant.length > 0) {
    insights.push({ category: 'customers', priority: 'medium', insight_type: 'opportunity', title: `${dormant.length} clientes inactivos`, description: `Tenés ${dormant.length} clientes recurrentes que no pidieron en el último mes. Un mensaje por WhatsApp podría reactivarlos.`, action_label: 'Ver clientes', action_route: '/admin/clientes' });
  }
  return insights;
}

function analyzeOperationalHealth(ctx: AnalysisContext): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const { orders, contactMessages, now } = ctx;
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowStr = (() => { const d = new Date(now); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();

  const overdue = orders.filter(o => o.desired_date < todayStr && (o.status === 'pending' || o.status === 'confirmed'));
  if (overdue.length > 0) {
    insights.push({ category: 'operations', priority: 'critical', insight_type: 'alert', title: `⚠️ ${overdue.length} pedido(s) vencidos`, description: `Hay ${overdue.length} pedido(s) con fecha de retiro vencida que no fueron completados ni cancelados. ¡Revisalos urgente!`, action_label: 'Ver pedidos', action_route: '/admin/pedidos' });
  }

  const unpaidTomorrow = orders.filter(o => o.desired_date === tomorrowStr && o.payment_status === 'pendiente' && o.status !== 'cancelled');
  if (unpaidTomorrow.length > 0) {
    insights.push({ category: 'operations', priority: 'high', insight_type: 'warning', title: `${unpaidTomorrow.length} pedido(s) sin pago para mañana`, description: `${unpaidTomorrow.length} pedido(s) para mañana aún no tienen seña confirmada. Contactá a los clientes.`, action_label: 'Ver pedidos', action_route: '/admin/pedidos' });
  }

  const old48h = contactMessages.filter(m => !m.read && new Date(m.created_at) < daysAgo(now, 2));
  if (old48h.length > 0) {
    insights.push({ category: 'operations', priority: 'medium', insight_type: 'warning', title: `${old48h.length} mensaje(s) sin leer (48h+)`, description: `Tenés ${old48h.length} mensaje(s) sin leer de hace más de 48 horas. Responder rápido mejora la imagen del negocio.`, action_label: 'Ver mensajes', action_route: '/admin/mensajes' });
  }
  return insights;
}

function analyzeDayOfWeekPatterns(ctx: AnalysisContext): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const dayNames = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
  const counts = Array(7).fill(0);
  ctx.orders.forEach(o => counts[new Date(o.created_at).getDay()]++);
  const max = Math.max(...counts);
  const min = Math.min(...counts.filter((_, i) => i > 0 && i < 6)); // weekdays only
  const peakDay = counts.indexOf(max);
  const weakDay = counts.indexOf(min);

  if (max > 0) {
    insights.push({ category: 'operations', priority: 'low', insight_type: 'suggestion', title: `📅 Pico: ${dayNames[peakDay]}`, description: `Tu día con más pedidos es ${dayNames[peakDay]}. Planificá la producción con anticipación.` });
  }
  if (min < max * 0.5 && weakDay > 0) {
    insights.push({ category: 'growth', priority: 'medium', insight_type: 'opportunity', title: `Oportunidad: ${dayNames[weakDay]}`, description: `Los ${dayNames[weakDay]} son tu día más tranquilo. Una promoción especial podría equilibrar tu producción semanal.` });
  }
  return insights;
}

function analyzeGrowthOpportunities(ctx: AnalysisContext): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const noDesc = ctx.products.filter(p => p.active && (!p.description || p.description.trim() === ''));
  if (noDesc.length > 0) {
    insights.push({ category: 'growth', priority: 'medium', insight_type: 'suggestion', title: `${noDesc.length} producto(s) sin descripción`, description: `${noDesc.length} producto(s) no tienen descripción. Agregar descripciones atractivas puede aumentar las conversiones.`, action_label: 'Completar productos', action_route: '/admin/productos' });
  }

  const featured = ctx.products.filter(p => p.featured);
  const featuredCats = [...new Set(featured.map(p => p.category))];
  if (featured.length > 1 && featuredCats.length === 1) {
    insights.push({ category: 'growth', priority: 'low', insight_type: 'opportunity', title: 'Diversificar destacados', description: `Todos tus productos destacados son de la misma categoría. Destacar productos de otras categorías mostraría la variedad de tu catálogo.` });
  }
  return insights;
}

export function runFullAnalysis(ctx: AnalysisContext): BusinessInsight[] {
  return [
    ...analyzeRevenueTrends(ctx),
    ...analyzeProductPerformance(ctx),
    ...analyzeCancellationRate(ctx),
    ...analyzeCustomerRetention(ctx),
    ...analyzeOperationalHealth(ctx),
    ...analyzeDayOfWeekPatterns(ctx),
    ...analyzeGrowthOpportunities(ctx),
  ].sort((a, b) => {
    const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4);
  });
}
