import { formatPrice } from '@/lib/formatPrice';

export interface SmartInsight {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionType: 'whatsapp' | 'product_actions' | 'promo_draft' | 'production_list' | 'navigate';
  actionLabel: string;
  actionData?: any;
  dismissed?: boolean;
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

function cleanPhone(phone: string): string {
  const digits = phone.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+54') || digits.startsWith('54')) return digits.replace('+', '');
  if (/^[23]\d{9}$/.test(digits)) return `549${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(message)}`;
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

// ==================== LAYER 2: DAILY SUMMARY ====================
export function generateDailySummary(orders: any[], products: any[], now: Date): DailySummaryData {
  const todayStr = now.toISOString().split('T')[0];
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días ☀️' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  if (!orders || orders.length === 0) {
    return { greeting, paragraph: `${greeting} ¡Bienvenido! Todavía no tenés pedidos. Cuando llegue el primero, acá vas a ver tu resumen diario.`, updatedAt: now };
  }

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

  // Phrase 4: Weekly summary
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekOrders = orders.filter(o => o.created_at >= weekStartStr && o.status !== 'cancelled');
  const weekTotal = weekOrders.reduce((s, o) => s + Number(o.total), 0);
  if (now.getDay() === 1 && weekOrders.length === 0) {
    phrases.push('La semana recién empieza.');
  } else {
    phrases.push(`Esta semana llevás ${weekOrders.length} pedido${weekOrders.length !== 1 ? 's' : ''} por ${formatPrice(weekTotal)}.`);
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

  // Phrase 6: Contextual (pick most relevant)
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Check peak day
  const dayCounts = Array(7).fill(0);
  orders.forEach(o => { if (o.status !== 'cancelled') dayCounts[new Date(o.created_at).getDay()]++; });
  const peakDay = dayCounts.indexOf(Math.max(...dayCounts));

  if (tomorrow.getDay() === peakDay && Math.max(...dayCounts) > 0) {
    phrases.push(`Mañana es ${DAY_NAMES_FULL[peakDay]}, tu día más activo. Revisá todo para estar listo.`);
  } else {
    // Check unpaid with upcoming pickup
    const unpaidSoon = orders.filter(o => o.payment_status === 'pendiente' && o.status !== 'cancelled' && o.desired_date >= todayStr && o.desired_date <= tomorrowStr);
    if (unpaidSoon.length > 0) {
      phrases.push(`Ojo: ${unpaidSoon[0].customer_name} retira pronto y no pagó la seña.`);
    } else {
      // Check repeat client this week
      const weekCustomers: Record<string, number> = {};
      weekOrders.forEach(o => { weekCustomers[o.customer_email] = (weekCustomers[o.customer_email] || 0) + 1; });
      const repeater = Object.entries(weekCustomers).find(([, count]) => count > 1);
      if (repeater) {
        const name = weekOrders.find(o => o.customer_email === repeater[0])?.customer_name;
        if (name) phrases.push(`¡${name} volvió a pedir esta semana! Cliente fiel 🤎`);
      } else {
        // Check products without sales
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

// ==================== LAYER 3: INSIGHTS ====================
export function generateInsights(orders: any[], products: any[], messages: any[], now: Date): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const todayStr = now.toISOString().split('T')[0];
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // 🔴 HIGH: Products with no sales in 60 days
  const recentOrders = orders.filter(o => o.created_at >= sixtyDaysAgo && o.status !== 'cancelled');
  const soldIds = new Set<string>();
  recentOrders.forEach(o => {
    (o.items as any[])?.forEach((item: any) => { if (item.productId) soldIds.add(item.productId); });
  });
  const activeProducts = products.filter(p => p.active);
  const noSalesProducts = activeProducts.filter(p => !soldIds.has(p.id));

  if (noSalesProducts.length > 0) {
    const names = noSalesProducts.map(p => p.name).join(', ');
    // Find a product in the same category that DOES sell
    const firstNoSale = noSalesProducts[0];
    const sameCatSeller = activeProducts.find(p => p.category === firstNoSale.category && soldIds.has(p.id));
    let desc = `Tenés ${noSalesProducts.length} producto${noSalesProducts.length > 1 ? 's' : ''} activo${noSalesProducts.length > 1 ? 's' : ''} sin ventas en 60 días: ${names}.`;
    if (sameCatSeller) desc += ` El más relevante es ${firstNoSale.name} porque está en la categoría que sí tiene ventas (${sameCatSeller.name}).`;
    const noImage = noSalesProducts.filter(p => !p.image_url);
    if (noImage.length > 0) desc += ` Además, ${noImage.map(p => p.name).join(', ')} no tiene${noImage.length > 1 ? 'n' : ''} foto cargada.`;

    insights.push({
      id: 'no-sales-products',
      priority: 'high',
      title: `${noSalesProducts.length} producto${noSalesProducts.length > 1 ? 's' : ''} sin ventas`,
      description: desc,
      actionType: 'product_actions',
      actionLabel: 'Sugerir acciones',
      actionData: { products: noSalesProducts.map(p => ({ id: p.id, name: p.name, category: p.category, image_url: p.image_url })) },
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
  if (inactiveClients.length > 0) {
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
    // Category averages
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

    // Top products for peak day
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
          break; // Only one emerging category
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
