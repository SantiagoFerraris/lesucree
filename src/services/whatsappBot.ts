/**
 * WhatsApp Bot — Order Notifications
 *
 * ⚠️ NODE-ONLY SERVICE
 * This module uses `whatsapp-web.js` + Puppeteer and CANNOT run in the browser.
 * Run it from a Node.js process (server, worker, CLI, or edge function host with Node runtime).
 *
 * First run:
 *   1. Console will print a QR code
 *   2. Scan it with WhatsApp (Linked Devices) on your phone
 *   3. Session is saved automatically to ./.wwebjs_auth
 *   4. After scan the bot logs "✅ WhatsApp bot ready"
 *
 * IMPORTANT:
 *   - Manager notifications go to +5493412741229 (Julieta).
 *   - Use your own phone number for the initial QR scan.
 */

import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth } = pkg;

type Product = { name: string; quantity: number; price: number };

let client: InstanceType<typeof Client> | null = null;
let isReady = false;

/* -------------------------------------------------------------------------- */
/*  Initialization                                                            */
/* -------------------------------------------------------------------------- */

export function initializeWhatsAppBot(): InstanceType<typeof Client> {
  if (client) return client;

  console.log('🤖 Initializing WhatsApp bot…');

  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'le-sucree-bot' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr: string) => {
    console.log('📱 Scan this QR with WhatsApp → Linked Devices:');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    console.log('🔐 WhatsApp authenticated, session saved.');
  });

  client.on('auth_failure', (msg: string) => {
    console.error('❌ WhatsApp auth failure:', msg);
  });

  client.on('ready', () => {
    isReady = true;
    console.log('✅ WhatsApp bot ready');
  });

  client.on('disconnected', (reason: string) => {
    isReady = false;
    console.warn('⚠️ WhatsApp disconnected:', reason);
    // Re-initialize after short delay
    setTimeout(() => {
      client = null;
      initializeWhatsAppBot();
    }, 5_000);
  });

  client.initialize().catch((err) => {
    console.error('❌ WhatsApp initialize error:', err);
  });

  return client;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function toChatId(phone: string): string {
  // "+5493412345678" → "5493412345678@c.us"
  return `${phone.replace(/\D/g, '')}@c.us`;
}

function formatProducts(products: Product[]): string {
  return products
    .map((p) => `• ${p.quantity}x ${p.name} — $${p.price.toLocaleString('es-AR')}`)
    .join('\n');
}

async function sendWithRetry(phone: string, message: string, maxRetries = 3): Promise<boolean> {
  if (!client) {
    console.error('❌ WhatsApp bot not initialized. Call initializeWhatsAppBot() first.');
    return false;
  }
  if (!isReady) {
    console.warn('⚠️ WhatsApp bot not ready yet, message skipped.');
    return false;
  }

  const chatId = toChatId(phone);
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.sendMessage(chatId, message);
      console.log(`✉️ WhatsApp sent to ${phone} (attempt ${attempt})`);
      return true;
    } catch (err) {
      lastErr = err;
      console.error(`❌ WhatsApp send failed (attempt ${attempt}/${maxRetries}):`, err);
      await new Promise((r) => setTimeout(r, 1_000 * attempt));
    }
  }

  console.error('❌ WhatsApp send giving up:', lastErr);
  return false;
}

/* -------------------------------------------------------------------------- */
/*  Customer notification                                                     */
/* -------------------------------------------------------------------------- */

export interface CustomerNotificationParams {
  customerPhone: string;
  customerName: string;
  orderId: string;
  orderTotal: number;
  products: Product[];
  pickupDate: string;
  pickupTime: string;
  businessAlias: string;
  businessPhone: string;
}

export async function sendOrderNotificationToCustomer(
  params: CustomerNotificationParams
): Promise<boolean> {
  const {
    customerPhone,
    customerName,
    orderId,
    orderTotal,
    products,
    pickupDate,
    pickupTime,
    businessAlias,
    businessPhone,
  } = params;

  const sena = Math.round(orderTotal * 0.5);

  const message = `Hola ${customerName}! 👋

Tu pedido #${orderId} está PENDIENTE DE CONFIRMACIÓN.

📋 RESUMEN:
${formatProducts(products)}
Total: $${orderTotal.toLocaleString('es-AR')}

📅 Retiro: ${pickupDate}
🕐 Horario: ${pickupTime}

💰 PARA CONFIRMAR ABONA LA SEÑA:
$${sena.toLocaleString('es-AR')} (50%)

📱 Alias Mercado Pago:
${businessAlias}

🕒 HORARIOS DE ATENCIÓN:
Lun-Vie: 9:00 a 18:00
Sáb: 10:00 a 17:00
Dom: Cerrado

📞 Dudas: ${businessPhone}

¡Le Sucrée Pastelería! 🎂`;

  return sendWithRetry(customerPhone, message);
}

/* -------------------------------------------------------------------------- */
/*  Manager notification                                                      */
/* -------------------------------------------------------------------------- */

export interface ManagerNotificationParams {
  managerPhone: string; // default "+5493412741229" (Julieta)
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderId: string;
  orderTotal: number;
  products: Product[];
  pickupDate: string;
  pickupTime: string;
  adminLink: string;
}

export async function sendOrderNotificationToManager(
  params: ManagerNotificationParams
): Promise<boolean> {
  const {
    managerPhone,
    customerName,
    customerPhone,
    customerEmail,
    orderId,
    orderTotal,
    products,
    pickupDate,
    pickupTime,
    adminLink,
  } = params;

  const message = `⚠️ NUEVO PEDIDO PENDIENTE #${orderId}

👤 ${customerName}
📱 ${customerPhone}
📧 ${customerEmail}

🎂 ${formatProducts(products)}

💰 $${orderTotal.toLocaleString('es-AR')}
📅 ${pickupDate}
🕐 ${pickupTime}

⏳ Pendiente de Confirmación

👉 Ver en admin:
${adminLink}`;

  return sendWithRetry(managerPhone, message);
}

/* -------------------------------------------------------------------------- */
/*  Status                                                                    */
/* -------------------------------------------------------------------------- */

export function isWhatsAppReady(): boolean {
  return isReady;
}
