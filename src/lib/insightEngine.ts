import { formatPrice } from '@/lib/formatPrice';

export interface SmartInsight {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionType: 'whatsapp' | 'product_actions' | 'promo_draft' | 'production_list' | 'navigate' | 'seasonal';
  actionLabel: string;
  actionData?: any;
  dismissed?: boolean;
  isSeasonal?: boolean;
}

export interface UrgentAlert {
  id: string;
  type: 'overdue' | 'today_pending' | 'payment_pending' | 'unread_messages';
  icon: string;
  text: string;
  order?: any;
  actions: { label: string; type: 'confirm_order' | 'mark_picked_up' | 'cancel_order' | 'whatsapp' | 'navigate'; data?: any }[];
}

export interface DailySummaryData {
  greeting: string;
  paragraph: string;
  updatedAt: Date;
}

const DAY_NAMES_FULL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

import { getWhatsAppLink } from '@/lib/whatsapp';

export function buildWhatsAppUrl(phone: string, message: string): string {
  return getWhatsAppLink(phone, message) ?? '#';
}

// ==================== LAYER 1: URGENT ALERTS ====================
export function generateUrgentAlerts(orders: any[], messages: any[], now: Date): UrgentAlert[] {
  const alerts: UrgentAlert[] = [];
  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const dayAfter = new Date(now); dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  // ALERT 2: Overdue pickups (highest priority)
  const overdue = orders.filter(o => o.desired_date < todayStr && o.status !== 'completed' && o.status !== 'picked_up' && o.status !== 'cancelled');
  overdue.forEach(o => {
    const daysOverdue = Math.floor((now.getTime() - new Date(o.desired_date + 'T12:00:00').getTime()) / 86400000);
    const product = getProductSummary(o.items);
    alerts.push({
      id: `overdue-${o.id}`,
      type: 'overdue',
      icon: '🔴',
      text: `${o.customer_name} — ${product}: retiro vencido hace ${daysOverdue} ${daysOverdue === 1 ? 'día' : 'días'}`,
      order: o,
      actions: [
        { label: 'Contactar', type: 'whatsapp', data: { phone: o.customer_phone, name: o.customer_name, product, template: 'reminder' } },
        { label: 'Marcar retirado', type: 'mark_picked_up', data: { orderId: o.id } },
        { label: 'Cancelar pedido', type: 'cancel_order', data: { orderId: o.id, name: o.customer_name } },
      ],
    });
  });

  // ALERT 1: Today's pickup not confirmed
  const todayPending = orders.filter(o => o.desired_date === todayStr && o.status === 'pending');
  todayPending.forEach(o => {
    const product = getProductSummary(o.items);
    alerts.push({
      id: `today-pending-${o.id}`,
      type: 'today_pending',
      icon: '⚠️',
      text: `${o.customer_name} tiene retiro HOY (${product}, ${o.preferred_time}) y el pedido sigue Pendiente`,
      order: o,
      actions: [
        { label: 'Confirmar pedido', type: 'confirm_order', data: { orderId: o.id } },
        { label: 'Contactar', type: 'whatsapp', data: { phone: o.customer_phone, name: o.customer_name, product, template: 'confirm' } },
      ],
    });
  });

  // ALERT 3: Pending payment with upcoming pickup (within 48hrs)
  const paymentPending = orders.filter(o =>
    o.payment_status === 'pendiente' &&
    o.status === 'confirmed' &&
    o.desired_date >= todayStr &&
    o.desired_date <= dayAfterStr
  );
  paymentPending.forEach(o => {
    const product = getProductSummary(o.items);
    const pickupDay = o.desired_date === todayStr ? 'hoy' : o.desired_date === tomorrowStr ? 'mañana' : formatDateShort(o.desired_date);
    alerts.push({
      id: `payment-${o.id}`,
      type: 'payment_pending',
      icon: '💰',
      text: `${o.customer_name} retira ${pickupDay} (${o.preferred_time}) y todavía no pagó seña (${product} — ${formatPrice(o.total)})`,
      order: o,
      actions: [
        { label: 'Recordar pago', type: 'whatsapp', data: { phone: o.customer_phone, name: o.customer_name, product, amount: o.total, desiredDate: o.desired_date, preferredTime: o.preferred_time, template: 'payment_reminder' } },
      ],
    });
  });

  // ALERT 4: Unread messages > 24h
  const oneDayAgo = new Date(now.getTime() - 86400000);
  const oldUnread = messages.filter(m => !m.read && new Date(m.created_at) < oneDayAgo);
  if (oldUnread.length > 0) {
    alerts.push({
      id: 'unread-messages',
      type: 'unread_messages',
      icon: '💬',
      text: `${oldUnread.length} mensaje${oldUnread.length > 1 ? 's' : ''} sin leer hace más de 24hs`,
      actions: [
        { label: 'Ver mensajes', type: 'navigate', data: { route: '/admin/mensajes' } },
      ],
    });
  }

  return alerts;
}

// ==================== HELPER: Early stage detection ====================
function isEarlyStage(orders: any[], now: Date): boolean {
  const nonCancelled = orders.filter(o => o.status !== 'cancelled');
  if (nonCancelled.length === 0) return true;

  // Fewer than 10 unique clients
  const uniqueClients = new Set(nonCancelled.map(o => o.customer_email));
  if (uniqueClients.size < 10) return true;

  // Fewer than 2 weeks of order data
  const dates = nonCancelled.map(o => new Date(o.created_at).getTime()).filter(t => !isNaN(t));
  if (dates.length === 0) return true;
  const oldest = Math.min(...dates);
  const daysSinceFirst = (now.getTime() - oldest) / 86400000;
  if (daysSinceFirst < 14) return true;

  return false;
}

// ==================== LAYER 2: DAILY SUMMARY ====================
export function generateDailySummary(orders: any[], products: any[], now: Date): DailySummaryData {
  const todayStr = now.toISOString().split('T')[0];
  const hour = now.getHours();
  const greeting = hour >= 6 && hour < 12 ? 'Buenos días ☀️' : hour >= 12 && hour < 19 ? 'Buenas tardes 🌤️' : 'Buenas noches 🌙';

  if (!orders || orders.length === 0) {
    return { greeting, paragraph: `${greeting} ¡Bienvenido! Todavía no tenés pedidos. Cuando llegue el primero, acá vas a ver tu resumen diario.`, updatedAt: now };
  }

  const earlyStage = isEarlyStage(orders, now);
  const phrases: string[] = [greeting];

  // Phrase 2: Today's pickups
  const todayPickups = orders.filter(o => o.desired_date === todayStr && o.status !== 'cancelled');
  if (todayPickups.length > 0) {
    const shifts = [...new Set(todayPickups.map(o => o.preferred_time))].join(', ');
    phrases.push(`Hoy tenés ${todayPickups.length} retiro${todayPickups.length > 1 ? 's' : ''} programado${todayPickups.length > 1 ? 's' : ''} para turno ${shifts}.`);
  } else {
    phrases.push('Hoy no tenés retiros programados.');
  }

  // Phrase 3: Pending orders
  const pending = orders.filter(o => o.status === 'pending');
  if (pending.length > 0) {
    phrases.push(`Hay ${pending.length} pedido${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''} de confirmación.`);
  }

  // Phrase 4: Weekly summary with week-over-week comparison
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekOrders = orders.filter(o => o.created_at >= weekStartStr && o.status !== 'cancelled');
  const weekTotal = weekOrders.reduce((s, o) => s + Number(o.total), 0);

  if (now.getDay() === 1 && weekOrders.length === 0) {
    phrases.push('La semana recién empieza.');
  } else {
    let weekPhrase = `Esta semana llevás ${weekOrders.length} pedido${weekOrders.length !== 1 ? 's' : ''} por ${formatPrice(weekTotal)}.`;

    // Week-over-week comparison (only if not early stage)
    if (!earlyStage) {
      const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
      const lastWeekOrders = orders.filter(o => o.created_at >= lastWeekStartStr && o.created_at < weekStartStr && o.status !== 'cancelled');
      const lastWeekTotal = lastWeekOrders.reduce((s, o) => s + Number(o.total), 0);

      if (lastWeekTotal > 0 && weekTotal > 0) {
        const change = Math.round(((weekTotal - lastWeekTotal) / lastWeekTotal) * 100);
        if (change > 0) {
          weekPhrase = `Esta semana facturaste ${formatPrice(weekTotal)}, un ${change}% más que la semana pasada 📈`;
        } else if (change < 0) {
          weekPhrase = `Esta semana llevás ${formatPrice(weekTotal)}, un ${Math.abs(change)}% menos que la semana pasada.`;
        } else {
          weekPhrase = `Esta semana llevás ${formatPrice(weekTotal)}, igual que la semana pasada.`;
        }
      }
    }
    phrases.push(weekPhrase);
  }

  // Phrase 5: Star product this week
  if (weekOrders.length > 0) {
    const productCounts: Record<string, { name: string; count: number }> = {};
    weekOrders.forEach(o => {
      (o.items as any[])?.forEach((item: any) => {
        const name = item.productName || 'Desconocido';
        if (!productCounts[name]) productCounts[name] = { name, count: 0 };
        productCounts[name].count += item.quantity || 1;
      });
    });
    const top = Object.values(productCounts).sort((a, b) => b.count - a.count)[0];
    if (top) {
      phrases.push(`Tu producto más pedido es ${top.name} (${top.count} ${top.count === 1 ? 'vez' : 'veces'}).`);
    }
  }

  // Phrase 6: Contextual
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const dayCounts = Array(7).fill(0);
  orders.forEach(o => { if (o.status !== 'cancelled') dayCounts[new Date(o.created_at).getDay()]++; });
  const peakDay = dayCounts.indexOf(Math.max(...dayCounts));

  if (tomorrow.getDay() === peakDay && Math.max(...dayCounts) > 0) {
    phrases.push(`Mañana es ${DAY_NAMES_FULL[peakDay]}, tu día más activo. Revisá todo para estar listo.`);
  } else {
    const unpaidSoon = orders.filter(o => o.payment_status === 'pendiente' && o.status !== 'cancelled' && o.desired_date >= todayStr && o.desired_date <= tomorrowStr);
    if (unpaidSoon.length > 0) {
      phrases.push(`Ojo: ${unpaidSoon[0].customer_name} retira pronto y no pagó la seña.`);
    } else {
      const weekCustomers: Record<string, number> = {};
      weekOrders.forEach(o => { weekCustomers[o.customer_email] = (weekCustomers[o.customer_email] || 0) + 1; });
      const repeater = Object.entries(weekCustomers).find(([, count]) => count > 1);
      if (repeater) {
        const name = weekOrders.find(o => o.customer_email === repeater[0])?.customer_name;
        if (name) phrases.push(`¡${name} volvió a pedir esta semana! Cliente fiel 🤎`);
      } else if (earlyStage) {
        // Early stage: motivational instead of alarming
        const activeProducts = products.filter(p => p.active);
        phrases.push(`Tu catálogo tiene ${activeProducts.length} producto${activeProducts.length !== 1 ? 's' : ''} listo${activeProducts.length !== 1 ? 's' : ''}. A medida que lleguen más pedidos vas a poder ver cuáles son los favoritos.`);
      } else {
        const activeProducts = products.filter(p => p.active);
        const soldIds = new Set<string>();
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();
        orders.filter(o => o.created_at >= sixtyDaysAgo && o.status !== 'cancelled').forEach(o => {
          (o.items as any[])?.forEach((item: any) => { if (item.productId) soldIds.add(item.productId); });
        });
        const noSales = activeProducts.filter(p => !soldIds.has(p.id));
        if (noSales.length > 0) {
          phrases.push(`Tenés ${noSales.length} producto${noSales.length > 1 ? 's' : ''} sin movimiento, revisalos cuando puedas.`);
        } else {
          phrases.push('Todo tranquilo por ahora.');
        }
      }
    }
  }

  return { greeting, paragraph: phrases.join(' '), updatedAt: now };
}

// ==================== SEASONAL ALERTS ====================
function getEasterDate(year: number): Date {
  // Computus algorithm for Easter Sunday
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getThirdSundayOfOctober(year: number): Date {
  const oct1 = new Date(year, 9, 1); // October 1st
  const firstSunday = oct1.getDay() === 0 ? 1 : 8 - oct1.getDay();
  return new Date(year, 9, firstSunday + 14); // 3rd Sunday
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

export function generateSeasonAlerts(today: Date): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const year = today.getFullYear();

  // Easter (30 days before)
  const easter = getEasterDate(year);
  const daysToEaster = daysBetween(today, easter);
  if (daysToEaster > 0 && daysToEaster <= 30) {
    insights.push({
      id: `seasonal-easter-${year}`,
      priority: daysToEaster <= 10 ? 'high' : 'medium',
      title: '🐣 Se acercan las Pascuas',
      description: `Faltan ${daysToEaster} días para Pascuas. ¿Querés activar huevos de chocolate o una promo especial?`,
      actionType: 'navigate',
      actionLabel: 'Ver productos',
      actionData: { route: '/admin/productos' },
      isSeasonal: true,
    });
  }

  // Mother's Day - 3rd Sunday of October in Argentina (30 days before)
  const mothersDay = getThirdSundayOfOctober(year);
  const daysToMothers = daysBetween(today, mothersDay);
  if (daysToMothers > 0 && daysToMothers <= 30) {
    insights.push({
      id: `seasonal-mothers-${year}`,
      priority: daysToMothers <= 10 ? 'high' : 'medium',
      title: '💐 Día de la Madre',
      description: `El Día de la Madre se acerca (en ${daysToMothers} días). Es la fecha más fuerte para pastelerías. ¡Preparate con tortas especiales y combos!`,
      actionType: 'navigate',
      actionLabel: 'Ver productos',
      actionData: { route: '/admin/productos' },
      isSeasonal: true,
    });
  }

  // Valentine's Day - Feb 14 (20 days before)
  let valentines = new Date(year, 1, 14);
  if (valentines < today) valentines = new Date(year + 1, 1, 14);
  const daysToValentines = daysBetween(today, valentines);
  if (daysToValentines > 0 && daysToValentines <= 20) {
    insights.push({
      id: `seasonal-valentines-${valentines.getFullYear()}`,
      priority: daysToValentines <= 7 ? 'high' : 'medium',
      title: '💝 San Valentín',
      description: `San Valentín viene en ${daysToValentines} días. Ideal para boxes románticas o tortas temáticas.`,
      actionType: 'navigate',
      actionLabel: 'Ver productos',
      actionData: { route: '/admin/productos' },
      isSeasonal: true,
    });
  }

  // Christmas / New Year (15 days before)
  let christmas = new Date(year, 11, 25);
  if (christmas < today) christmas = new Date(year + 1, 11, 25);
  const daysToChristmas = daysBetween(today, christmas);
  if (daysToChristmas > 0 && daysToChristmas <= 15) {
    insights.push({
      id: `seasonal-christmas-${christmas.getFullYear()}`,
      priority: daysToChristmas <= 5 ? 'high' : 'medium',
      title: '🎄 Temporada de fiestas',
      description: `¡Faltan ${daysToChristmas} días para Navidad! ¿Tenés pan dulce o postres navideños en el catálogo?`,
      actionType: 'navigate',
      actionLabel: 'Ver catálogo',
      actionData: { route: '/admin/productos' },
      isSeasonal: true,
    });
  }

  // Día del Amigo - July 20 (7 days before)
  let diaAmigo = new Date(year, 6, 20);
  if (diaAmigo < today) diaAmigo = new Date(year + 1, 6, 20);
  const daysToDiaAmigo = daysBetween(today, diaAmigo);
  if (daysToDiaAmigo > 0 && daysToDiaAmigo <= 7) {
    insights.push({
      id: `seasonal-amigo-${diaAmigo.getFullYear()}`,
      priority: 'medium',
      title: '🤝 Día del Amigo',
      description: `Se viene el Día del Amigo en ${daysToDiaAmigo} días. Ideal para promocionar boxes y cookies.`,
      actionType: 'navigate',
      actionLabel: 'Crear promo',
      actionData: { route: '/admin/productos' },
      isSeasonal: true,
    });
  }

  return insights;
}

// ==================== LAYER 3: INSIGHTS ====================
export function generateInsights(orders: any[], products: any[], messages: any[], now: Date): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const todayStr = now.toISOString().split('T')[0];
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const earlyStage = isEarlyStage(orders, now);

  // 🔴 HIGH: Products with no sales in 60 days (smarter version)
  const recentOrders = orders.filter(o => o.created_at >= sixtyDaysAgo && o.status !== 'cancelled');
  const soldIds = new Set<string>();
  const soldByCategory: Record<string, number> = {};
  recentOrders.forEach(o => {
    (o.items as any[])?.forEach((item: any) => {
      if (item.productId) {
        soldIds.add(item.productId);
        const p = products.find(pr => pr.id === item.productId);
        if (p) soldByCategory[p.category] = (soldByCategory[p.category] || 0) + 1;
      }
    });
  });
  const activeProducts = products.filter(p => p.active);
  const noSalesProducts = activeProducts.filter(p => !soldIds.has(p.id));

  if (noSalesProducts.length > 0 && !earlyStage) {
    // Rank by relevance: products in categories that DO sell are more relevant
    const ranked = [...noSalesProducts].sort((a, b) => {
      const aSales = soldByCategory[a.category] || 0;
      const bSales = soldByCategory[b.category] || 0;
      return bSales - aSales; // Higher sales in category = more relevant
    });

    const topRelevant = noSalesProducts.length > 5 ? ranked.slice(0, 3) : ranked;
    const names = topRelevant.map(p => p.name).join(', ');

    let desc: string;
    if (noSalesProducts.length > 5) {
      desc = `${topRelevant.length} productos en categorías populares no se vendieron aún: ${names}. ¿Los promocionamos o los pausamos?`;
      if (noSalesProducts.length > topRelevant.length) {
        desc += ` (${noSalesProducts.length - topRelevant.length} más en otras categorías)`;
      }
    } else {
      desc = `${noSalesProducts.length} producto${noSalesProducts.length > 1 ? 's' : ''} activo${noSalesProducts.length > 1 ? 's' : ''} sin ventas en 60 días: ${names}. ¿Los destacamos, les hacemos descuento o los pausamos?`;
    }

    const noImage = topRelevant.filter(p => !p.image_url);
    if (noImage.length > 0) desc += ` Ojo: ${noImage.map(p => p.name).join(', ')} no tiene${noImage.length > 1 ? 'n' : ''} foto cargada.`;

    insights.push({
      id: 'no-sales-products',
      priority: 'high',
      title: noSalesProducts.length > 5
        ? `${noSalesProducts.length} productos sin ventas`
        : `${noSalesProducts.length} producto${noSalesProducts.length > 1 ? 's' : ''} sin ventas`,
      description: desc,
      actionType: 'product_actions',
      actionLabel: 'Sugerir acciones',
      actionData: { products: topRelevant.map(p => ({ id: p.id, name: p.name, category: p.category, image_url: p.image_url })) },
    });
  } else if (noSalesProducts.length > 0 && earlyStage) {
    // Early stage: motivational tone
    insights.push({
      id: 'no-sales-products-early',
      priority: 'low',
      title: 'Catálogo listo para despegar',
      description: `Tu catálogo tiene ${activeProducts.length} productos listos. A medida que lleguen más pedidos vas a poder ver cuáles son los favoritos y ajustar tu oferta.`,
      actionType: 'navigate',
      actionLabel: 'Ver catálogo',
      actionData: { route: '/admin/productos' },
    });
  }

  // 🔴 HIGH: Recoverable inactive clients
  const customerMap: Record<string, { name: string; email: string; phone: string; orders: any[]; lastOrderDate: string }> = {};
  orders.filter(o => o.status !== 'cancelled').forEach(o => {
    const k = o.customer_email;
    if (!customerMap[k]) customerMap[k] = { name: o.customer_name, email: o.customer_email, phone: o.customer_phone, orders: [], lastOrderDate: '' };
    customerMap[k].orders.push(o);
    if (!customerMap[k].lastOrderDate || o.created_at > customerMap[k].lastOrderDate) customerMap[k].lastOrderDate = o.created_at;
  });
  const inactiveClients = Object.values(customerMap).filter(c => c.orders.length >= 1 && c.lastOrderDate < thirtyDaysAgo);
  if (inactiveClients.length > 0 && !earlyStage) {
    const sorted = inactiveClients.sort((a, b) => b.lastOrderDate.localeCompare(a.lastOrderDate));
    const names = sorted.slice(0, 3).map(c => c.name).join(', ');
    const mostRecent = sorted[0];
    const lastProduct = getProductSummary(mostRecent.orders[mostRecent.orders.length - 1]?.items);
    const lastDate = formatDateShort(mostRecent.lastOrderDate);
    insights.push({
      id: 'inactive-clients',
      priority: 'high',
      title: `${inactiveClients.length} cliente${inactiveClients.length > 1 ? 's' : ''} inactivo${inactiveClients.length > 1 ? 's' : ''}`,
      description: `Tenés ${inactiveClients.length} cliente${inactiveClients.length > 1 ? 's' : ''} que no pide${inactiveClients.length > 1 ? 'n' : ''} hace más de 30 días: ${names}. ${mostRecent.name} fue tu última compra inactiva, pidió ${lastProduct} el ${lastDate}.`,
      actionType: 'whatsapp',
      actionLabel: 'Preparar mensaje de reactivación',
      actionData: { clients: sorted.slice(0, 5).map(c => ({ name: c.name, phone: c.phone, email: c.email, lastProduct: getProductSummary(c.orders[c.orders.length - 1]?.items) })) },
    });
  }

  // 🟡 MEDIUM: Slow day opportunity
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000).toISOString();
  const last4WeeksOrders = orders.filter(o => o.created_at >= fourWeeksAgo && o.status !== 'cancelled');
  if (last4WeeksOrders.length >= 5) {
    const dayCounts = Array(7).fill(0);
    last4WeeksOrders.forEach(o => dayCounts[new Date(o.created_at).getDay()]++);
    const weekdayCounts = dayCounts.map((c, i) => ({ day: i, count: c })).filter(d => d.day >= 1 && d.day <= 6);
    const slowDay = weekdayCounts.reduce((min, d) => d.count < min.count ? d : min, weekdayCounts[0]);
    const peakDay = dayCounts.indexOf(Math.max(...dayCounts));

    if (slowDay && slowDay.count < dayCounts[peakDay] * 0.6) {
      insights.push({
        id: 'slow-day',
        priority: 'medium',
        title: `Oportunidad: ${DAY_NAMES_FULL[slowDay.day]}`,
        description: `Los ${DAY_NAMES_FULL[slowDay.day]} son tu día más tranquilo (${slowDay.count} pedidos en las últimas 4 semanas vs ${dayCounts[peakDay]} los ${DAY_NAMES_FULL[peakDay]}). Una promo exclusiva para ese día podría equilibrar tu semana.`,
        actionType: 'promo_draft',
        actionLabel: 'Crear idea de promo',
        actionData: { dayOfWeek: slowDay.day, dayName: DAY_NAMES_FULL[slowDay.day] },
      });
    }
  }

  // 🟡 MEDIUM: Retention and loyal client
  const allCustomers = Object.values(customerMap);
  const totalClients = allCustomers.length;
  const repeatClients = allCustomers.filter(c => c.orders.length > 1);
  const retentionRate = totalClients > 0 ? Math.round((repeatClients.length / totalClients) * 100) : 0;

  if (totalClients >= 3) {
    const loyalClient = repeatClients.sort((a, b) => b.orders.length - a.orders.length)[0];
    if (loyalClient) {
      const loyalTotal = loyalClient.orders.reduce((s, o) => s + Number(o.total), 0);
      insights.push({
        id: 'retention',
        priority: 'medium',
        title: `Retención: ${retentionRate}%`,
        description: `Tu tasa de retención es ${retentionRate}% (${repeatClients.length} de ${totalClients} clientes volvieron a pedir). Tu cliente más fiel es ${loyalClient.name} con ${loyalClient.orders.length} pedidos por un total de ${formatPrice(loyalTotal)}. Podrías enviarle un agradecimiento.`,
        actionType: 'whatsapp',
        actionLabel: 'Preparar agradecimiento',
        actionData: { clients: [{ name: loyalClient.name, phone: loyalClient.phone, email: loyalClient.email }], template: 'thank_you' },
      });
    }
  }

  // 🟡 MEDIUM: Average ticket and upsell
  const nonCancelledOrders = orders.filter(o => o.status !== 'cancelled');
  if (nonCancelledOrders.length >= 5) {
    const avgTicket = nonCancelledOrders.reduce((s, o) => s + Number(o.total), 0) / nonCancelledOrders.length;
    const catTotals: Record<string, { sum: number; count: number }> = {};
    nonCancelledOrders.forEach(o => {
      (o.items as any[])?.forEach((item: any) => {
        const p = products.find(pr => pr.id === item.productId);
        const cat = p?.category || 'otros';
        if (!catTotals[cat]) catTotals[cat] = { sum: 0, count: 0 };
        catTotals[cat].sum += (item.unitPrice || 0) * (item.quantity || 1);
        catTotals[cat].count += item.quantity || 1;
      });
    });
    const catAvgs = Object.entries(catTotals).map(([cat, d]) => ({ cat, avg: d.count > 0 ? d.sum / d.count : 0 })).filter(c => c.avg > 0);
    if (catAvgs.length >= 2) {
      catAvgs.sort((a, b) => b.avg - a.avg);
      insights.push({
        id: 'avg-ticket',
        priority: 'medium',
        title: `Ticket promedio: ${formatPrice(avgTicket)}`,
        description: `Tu ticket promedio es ${formatPrice(avgTicket)}. Los pedidos de ${catAvgs[0].cat} promedian ${formatPrice(catAvgs[0].avg)} vs ${formatPrice(catAvgs[catAvgs.length - 1].avg)} de ${catAvgs[catAvgs.length - 1].cat}. Podrías sugerir complementos (ej: sumar cookies a una torta).`,
        actionType: 'navigate',
        actionLabel: 'Ver análisis de precios',
        actionData: { route: '/admin/estadisticas' },
      });
    }
  }

  // 🟢 LOW: Weekly demand prediction
  if (last4WeeksOrders.length >= 7) {
    const dayCounts = Array(7).fill(0);
    last4WeeksOrders.forEach(o => dayCounts[new Date(o.created_at).getDay()]++);
    const peakDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const avgPeak = Math.round(dayCounts[peakDayIdx] / 4);

    const peakProducts: Record<string, { name: string; count: number }> = {};
    last4WeeksOrders.filter(o => new Date(o.created_at).getDay() === peakDayIdx).forEach(o => {
      (o.items as any[])?.forEach((item: any) => {
        const name = item.productName || 'Desconocido';
        if (!peakProducts[name]) peakProducts[name] = { name, count: 0 };
        peakProducts[name].count += item.quantity || 1;
      });
    });
    const topPeakProducts = Object.values(peakProducts).sort((a, b) => b.count - a.count).slice(0, 3);

    insights.push({
      id: 'demand-prediction',
      priority: 'low',
      title: '📊 Predicción para esta semana',
      description: `Según las últimas 4 semanas: ${DAY_NAMES_FULL[peakDayIdx]} es tu día más fuerte (~${avgPeak} pedidos). Productos más pedidos los ${DAY_NAMES_FULL[peakDayIdx]}: ${topPeakProducts.map(p => `${p.name} (${p.count}x)`).join(', ')}.`,
      actionType: 'production_list',
      actionLabel: 'Ver lista de producción',
      actionData: { peakDay: peakDayIdx, orders: last4WeeksOrders, products },
    });
  } else {
    insights.push({
      id: 'demand-prediction-nodata',
      priority: 'low',
      title: '📊 Predicción de demanda',
      description: 'Todavía no hay suficientes datos para predecir demanda. Después de 2 semanas de pedidos vas a ver predicciones automáticas.',
      actionType: 'navigate',
      actionLabel: '',
      actionData: {},
    });
  }

  // 🟢 LOW: Emerging category
  if (last4WeeksOrders.length > 0) {
    const thisWeekStart = new Date(now); thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const thisWeekStr = thisWeekStart.toISOString();
    const lastWeekStr = lastWeekStart.toISOString();

    const thisWeekCats: Record<string, number> = {};
    const lastWeekCats: Record<string, number> = {};
    orders.filter(o => o.created_at >= thisWeekStr && o.status !== 'cancelled').forEach(o => {
      (o.items as any[])?.forEach((item: any) => {
        const p = products.find(pr => pr.id === item.productId);
        const cat = p?.category || 'otros';
        thisWeekCats[cat] = (thisWeekCats[cat] || 0) + (item.quantity || 1);
      });
    });
    orders.filter(o => o.created_at >= lastWeekStr && o.created_at < thisWeekStr && o.status !== 'cancelled').forEach(o => {
      (o.items as any[])?.forEach((item: any) => {
        const p = products.find(pr => pr.id === item.productId);
        const cat = p?.category || 'otros';
        lastWeekCats[cat] = (lastWeekCats[cat] || 0) + (item.quantity || 1);
      });
    });

    for (const [cat, thisCount] of Object.entries(thisWeekCats)) {
      const lastCount = lastWeekCats[cat] || 0;
      if (lastCount > 0 && thisCount > lastCount) {
        const growth = Math.round(((thisCount - lastCount) / lastCount) * 100);
        if (growth > 20) {
          insights.push({
            id: `emerging-${cat}`,
            priority: 'low',
            title: `Categoría en crecimiento: ${cat}`,
            description: `La categoría ${cat} creció ${growth}% esta semana (${thisCount} vs ${lastCount} pedidos). Considerá destacar más productos de esta categoría.`,
            actionType: 'navigate',
            actionLabel: 'Ver productos de la categoría',
            actionData: { route: '/admin/productos', filter: cat },
          });
          break;
        }
      }
    }
  }

  return insights;
}

// ==================== PRODUCTION LIST ====================
export function generateProductionList(orders: any[], products: any[], targetDay: number, now: Date): { product: string; quantity: number; category: string; price: number }[] {
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000).toISOString();
  const relevantOrders = orders.filter(o =>
    o.created_at >= fourWeeksAgo && o.status !== 'cancelled' && new Date(o.created_at).getDay() === targetDay
  );

  const productMap: Record<string, { name: string; qty: number; category: string; price: number }> = {};
  relevantOrders.forEach(o => {
    (o.items as any[])?.forEach((item: any) => {
      const name = item.productName || 'Desconocido';
      if (!productMap[name]) {
        const p = products.find(pr => pr.id === item.productId);
        productMap[name] = { name, qty: 0, category: p?.category || 'otros', price: item.unitPrice || p?.price || 0 };
      }
      productMap[name].qty += item.quantity || 1;
    });
  });

  return Object.values(productMap)
    .map(p => ({ product: p.name, quantity: Math.ceil(p.qty / 4) + 1, category: p.category, price: p.price }))
    .sort((a, b) => b.quantity - a.quantity);
}

// ==================== HELPERS ====================
function getProductSummary(items: any): string {
  if (!items || !Array.isArray(items) || items.length === 0) return '—';
  const first = items[0]?.productName || '—';
  if (items.length === 1) return first;
  return `${first} + ${items.length - 1} más`;
}

function formatDateShort(d: string): string {
  if (!d) return '—';
  const dateObj = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
  if (isNaN(dateObj.getTime())) return '—';
  return dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// ==================== RETENTION INSIGHTS ====================
export interface RetentionInsight {
  id: string;
  type: 'first_timer_followup' | 'inactive_client' | 'frequent_client';
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  product: string;
  daysSince: number;
  orderCount: number;
  totalSpent: number;
  whatsappMessage: string;
}

export function generateRetentionInsights(orders: any[], products: any[], today: Date): RetentionInsight[] {
  const insights: RetentionInsight[] = [];
  const thirtyDaysAgo = today.getTime() - 30 * 86400000;
  const sevenDaysAgo = today.getTime() - 7 * 86400000;

  // Build client map
  const clientMap: Record<string, { name: string; phone: string; email: string; orders: any[]; lastOrderDate: number; firstOrderDate: number; totalSpent: number }> = {};
  orders.filter(o => o.status !== 'cancelled').forEach(o => {
    const key = o.customer_email;
    const ts = new Date(o.created_at).getTime();
    if (!clientMap[key]) {
      clientMap[key] = { name: o.customer_name, phone: o.customer_phone, email: o.customer_email, orders: [], lastOrderDate: ts, firstOrderDate: ts, totalSpent: 0 };
    }
    clientMap[key].orders.push(o);
    clientMap[key].totalSpent += Number(o.total);
    if (ts > clientMap[key].lastOrderDate) clientMap[key].lastOrderDate = ts;
    if (ts < clientMap[key].firstOrderDate) clientMap[key].firstOrderDate = ts;
  });

  // Find a featured product name for suggestion messages
  const featuredProduct = products.find(p => p.featured && p.active)?.name || products.find(p => p.active)?.name || 'nuestras novedades';

  for (const client of Object.values(clientMap)) {
    const daysSinceLast = Math.floor((today.getTime() - client.lastOrderDate) / 86400000);
    const lastOrder = client.orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const lastProduct = lastOrder ? ((lastOrder.items as any[])?.[0]?.productName || 'tu pedido') : 'tu pedido';

    // First-timer follow-up: 1 order, first order > 7 days ago, hasn't ordered again
    if (client.orders.length === 1 && client.firstOrderDate < sevenDaysAgo && daysSinceLast > 7 && daysSinceLast <= 30) {
      insights.push({
        id: `retention-first-${client.email}`,
        type: 'first_timer_followup',
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        product: lastProduct,
        daysSince: daysSinceLast,
        orderCount: 1,
        totalSpent: client.totalSpent,
        whatsappMessage: `¡Hola ${client.name}! Soy de Le Sucrée 🧁 ¿Qué tal estuvo tu ${lastProduct}? Te cuento que esta semana tenemos ${featuredProduct}. ¡Te esperamos!`,
      });
    }

    // Inactive client: 1 order, > 30 days ago
    if (client.orders.length === 1 && daysSinceLast > 30) {
      insights.push({
        id: `retention-inactive-${client.email}`,
        type: 'inactive_client',
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        product: lastProduct,
        daysSince: daysSinceLast,
        orderCount: 1,
        totalSpent: client.totalSpent,
        whatsappMessage: `¡Hola ${client.name}! Desde Le Sucrée te extrañamos 🤎 Hace un tiempo probaste ${lastProduct}. Tenemos novedades que te van a encantar. ¡Escribinos para tu próximo pedido!`,
      });
    }

    // Frequent client badge: 2+ orders (just for display, not a "problem")
    if (client.orders.length >= 2) {
      insights.push({
        id: `retention-frequent-${client.email}`,
        type: 'frequent_client',
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        product: lastProduct,
        daysSince: daysSinceLast,
        orderCount: client.orders.length,
        totalSpent: client.totalSpent,
        whatsappMessage: `¡Hola ${client.name}! Desde Le Sucrée queremos agradecerte por elegirnos siempre 🤎 ¡Sos parte de la familia! Para tu próximo pedido consultanos por ${featuredProduct}.`,
      });
    }
  }

  // Sort: first_timer_followup first, then inactive, then frequent
  const typeOrder = { first_timer_followup: 0, inactive_client: 1, frequent_client: 2 };
  insights.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  return insights;
}
