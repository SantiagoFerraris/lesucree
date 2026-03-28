export const WHATSAPP_NUMBER = '5493412741229';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const WHATSAPP_NOTIFICATION_NUMBER = '5493412741229';
export const INSTAGRAM_URL = 'https://www.instagram.com/pasteleria.lesucree/';
export const INSTAGRAM_HANDLE = '@pasteleria.lesucree';

export const CATEGORIES = [
  { value: 'todos', label: 'Todos' },
  { value: 'tortas', label: 'Tortas' },
  { value: 'cookies', label: 'Cookies' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'postres_individuales', label: 'Postres individuales' },
  { value: 'mesa_dulce', label: 'Mesa dulce' },
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  tortas: 'Tortas',
  cookies: 'Cookies',
  boxes: 'Boxes',
  postres_individuales: 'Postres individuales',
  mesa_dulce: 'Mesa dulce',
};
