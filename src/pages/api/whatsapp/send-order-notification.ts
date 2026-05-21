/**
 * POST /api/whatsapp/send-order-notification
 *
 * ⚠️ NODE-ONLY ENDPOINT
 * This handler imports `whatsappBot`, which depends on `whatsapp-web.js` +
 * Puppeteer and CANNOT run in the browser. Mount it in a Node-based API
 * runtime (Next.js API routes, Express, Hono on Node, etc.).
 *
 * Manager phone is hardcoded to +5493412741229 (Julieta) when not provided.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  sendOrderNotificationToCustomer,
  sendOrderNotificationToManager,
} from '@/services/whatsappBot';

const DEFAULT_MANAGER_PHONE = '+5493412741229'; // Julieta
const DEFAULT_ADMIN_LINK = 'https://lesucreepasteleria.com.ar/admin';
const DEFAULT_BUSINESS_ALIAS = 'julieta.ferraris.mp';
const DEFAULT_BUSINESS_PHONE = '0341 274-1229';

type Product = { name: string; quantity: number; price: number };

interface RequestBody {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderId: string;
  orderTotal: number;
  products: Product[];
  pickupDate: string;
  pickupTime: string;
  managerPhone?: string;
  adminLink?: string;
  businessAlias?: string;
  businessPhone?: string;
}

interface SuccessResponse {
  success: true;
  message: string;
  customerNotified: boolean;
  managerNotified: boolean;
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  customerNotified: boolean;
  managerNotified: boolean;
}

const PHONE_REGEX = /^\+54\d{10,13}$/;

function validate(body: Partial<RequestBody>): string | null {
  const required: (keyof RequestBody)[] = [
    'customerName',
    'customerPhone',
    'customerEmail',
    'orderId',
    'orderTotal',
    'products',
    'pickupDate',
    'pickupTime',
  ];
  for (const key of required) {
    if (body[key] === undefined || body[key] === null || body[key] === '') {
      return `Missing required field: ${key}`;
    }
  }
  if (typeof body.orderTotal !== 'number' || body.orderTotal <= 0) {
    return 'orderTotal must be a positive number';
  }
  if (!Array.isArray(body.products) || body.products.length === 0) {
    return 'products must be a non-empty array';
  }
  if (!PHONE_REGEX.test(body.customerPhone!)) {
    return 'customerPhone must be in international format (+54…)';
  }
  if (body.managerPhone && !PHONE_REGEX.test(body.managerPhone)) {
    return 'managerPhone must be in international format (+54…)';
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      customerNotified: false,
      managerNotified: false,
    });
  }

  const body = (req.body ?? {}) as Partial<RequestBody>;
  const validationError = validate(body);
  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
      customerNotified: false,
      managerNotified: false,
    });
  }

  const {
    customerName,
    customerPhone,
    customerEmail,
    orderId,
    orderTotal,
    products,
    pickupDate,
    pickupTime,
    managerPhone = DEFAULT_MANAGER_PHONE,
    adminLink = DEFAULT_ADMIN_LINK,
    businessAlias = DEFAULT_BUSINESS_ALIAS,
    businessPhone = DEFAULT_BUSINESS_PHONE,
  } = body as RequestBody;

  let customerNotified = false;
  let managerNotified = false;
  const errors: string[] = [];

  // Customer — failure must NOT block manager notification
  try {
    customerNotified = await sendOrderNotificationToCustomer({
      customerPhone,
      customerName,
      orderId,
      orderTotal,
      products,
      pickupDate,
      pickupTime,
      businessAlias,
      businessPhone,
    });
    if (!customerNotified) errors.push('Customer notification returned false');
  } catch (err) {
    console.error('[whatsapp] customer notification failed:', err);
    errors.push(`customer: ${(err as Error).message}`);
  }

  // Manager — always attempted
  try {
    managerNotified = await sendOrderNotificationToManager({
      managerPhone, // defaults to +5493412741229 (Julieta)
      customerName,
      customerPhone,
      customerEmail,
      orderId,
      orderTotal,
      products,
      pickupDate,
      pickupTime,
      adminLink,
    });
    if (!managerNotified) errors.push('Manager notification returned false');
  } catch (err) {
    console.error('[whatsapp] manager notification failed:', err);
    errors.push(`manager: ${(err as Error).message}`);
  }

  if (customerNotified && managerNotified) {
    return res.status(200).json({
      success: true,
      message: 'Notifications sent successfully',
      customerNotified,
      managerNotified,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Failed to send notifications',
    error: errors.join(' | ') || 'Unknown error',
    customerNotified,
    managerNotified,
  });
}
