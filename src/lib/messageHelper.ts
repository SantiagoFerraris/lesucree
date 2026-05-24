import { formatPrice } from '@/lib/formatPrice';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  active?: boolean | null;
  description?: string | null;
}

export interface ReplySuggestion {
  text: string;
  matchedProducts: Product[];
  reason: string;
}

const CATALOG_URL = 'https://lesucreepasteleria.com.ar/catalogo';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  tortas: ['torta', 'tortita', 'pastel', 'cake', 'tarta', 'cumpleaños', 'cumple'],
  cookies: ['cookie', 'cookies', 'galleta', 'galletas', 'alfajor', 'alfajores'],
  budines: ['budin', 'budín', 'budines'],
  cheesecake: ['cheesecake', 'cheese cake', 'cheese'],
  cupcakes: ['cupcake', 'cupcakes', 'muffin', 'muffins'],
  boxes: ['box', 'boxes', 'caja', 'cajita', 'combo'],
};

const PRICE_KEYWORDS = ['precio', 'cuánto', 'cuanto', 'cuesta', 'sale', 'valor', 'costos', 'costo', 'presupuesto'];
const ORDER_KEYWORDS = ['pedido', 'encargar', 'reservar', 'reserva', 'quiero', 'necesito', 'hacen', 'pueden hacer'];

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Try to fuzzy-match a word to product names
 */
function fuzzyMatchProducts(words: string[], products: Product[]): Product[] {
  const matched: Product[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    if (word.length < 4) continue; // skip short words
    for (const product of products) {
      if (seen.has(product.id)) continue;
      const productNameLower = product.name.toLowerCase();
      const productWords = productNameLower.split(/\s+/);

      // Direct includes
      if (productNameLower.includes(word) || word.includes(productNameLower)) {
        matched.push(product);
        seen.add(product.id);
        continue;
      }

      // startsWith on any word of product name
      if (productWords.some(pw => pw.startsWith(word) || word.startsWith(pw))) {
        matched.push(product);
        seen.add(product.id);
        continue;
      }

      // Levenshtein distance <= 2 for words of similar length
      for (const pw of productWords) {
        if (pw.length < 4) continue;
        const dist = levenshtein(word, pw);
        if (dist <= 2 && dist < pw.length * 0.4) {
          matched.push(product);
          seen.add(product.id);
          break;
        }
      }
    }
  }

  return matched;
}

function formatProductList(products: Product[]): string {
  return products
    .slice(0, 5)
    .map(p => `• ${p.name} — desde ${formatPrice(p.price)}`)
    .join('\n');
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw));
}

function findCategoryProducts(text: string, products: Product[]): { category: string; products: Product[] } | null {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (containsAny(text, keywords)) {
      const catProducts = products.filter(p =>
        p.active !== false && p.category.toLowerCase().includes(category.toLowerCase())
      );
      if (catProducts.length > 0) {
        return { category, products: catProducts };
      }
      // Also try matching any product whose name contains the keywords
      const nameMatched = products.filter(p =>
        p.active !== false && keywords.some(kw => p.name.toLowerCase().includes(kw))
      );
      if (nameMatched.length > 0) {
        return { category, products: nameMatched };
      }
    }
  }
  return null;
}

export function generateReplySuggestion(messageText: string, products: Product[]): ReplySuggestion {
  const text = messageText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const originalLower = messageText.toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const activeProducts = products.filter(p => p.active !== false);

  // 1. Check for ordering intent
  if (containsAny(originalLower, ORDER_KEYWORDS)) {
    return {
      text: `¡Hola! Gracias por tu interés 🤎 Para hacer un pedido necesitamos al menos 48hs de anticipación. Podés elegir del catálogo en ${CATALOG_URL} y escribirnos por WhatsApp.\n\nRetirás en Catamarca 1473, 1° B.\nHorarios: Mañana 9-12 / Tarde 14-19. 🧁`,
      matchedProducts: [],
      reason: 'Consulta sobre pedidos',
    };
  }

  // 2. Check for category match
  const categoryMatch = findCategoryProducts(originalLower, activeProducts);

  // 3. Check for price inquiry
  if (containsAny(originalLower, PRICE_KEYWORDS)) {
    // Try fuzzy match to specific products
    const fuzzyMatched = fuzzyMatchProducts(words, activeProducts);
    if (fuzzyMatched.length > 0) {
      return {
        text: `¡Hola! Gracias por tu consulta 🤎 Te paso los precios:\n\n${formatProductList(fuzzyMatched)}\n\nPodés ver todo el catálogo en ${CATALOG_URL}. ¡Cualquier duda escribinos! 😊`,
        matchedProducts: fuzzyMatched,
        reason: `Consulta de precio — ${fuzzyMatched.length} producto${fuzzyMatched.length > 1 ? 's' : ''} encontrado${fuzzyMatched.length > 1 ? 's' : ''}`,
      };
    }
    if (categoryMatch) {
      return {
        text: `¡Hola! Gracias por tu consulta 🤎 Te paso lo que tenemos en ${categoryMatch.category}:\n\n${formatProductList(categoryMatch.products)}\n\nPodés ver todo en ${CATALOG_URL}. ¡Consultanos cualquier cosa! 😊`,
        matchedProducts: categoryMatch.products,
        reason: `Consulta de precio en categoría "${categoryMatch.category}"`,
      };
    }
    // Generic price reply
    return {
      text: `¡Hola! Gracias por tu consulta 🤎 Podés ver todos nuestros productos con precios en ${CATALOG_URL}.\n\nSi necesitás algo personalizado, contanos y te armamos un presupuesto. 😊`,
      matchedProducts: [],
      reason: 'Consulta de precios general',
    };
  }

  // 4. Category match without price keywords
  if (categoryMatch) {
    return {
      text: `¡Hola! Gracias por escribirnos 🤎 Te cuento lo que tenemos en ${categoryMatch.category}:\n\n${formatProductList(categoryMatch.products)}\n\nPodés ver todo el catálogo en ${CATALOG_URL}. Para pedidos necesitamos 48hs de anticipación. 😊`,
      matchedProducts: categoryMatch.products,
      reason: `Interés en categoría "${categoryMatch.category}"`,
    };
  }

  // 5. Fuzzy match to product names
  const fuzzyMatched = fuzzyMatchProducts(words, activeProducts);
  if (fuzzyMatched.length > 0) {
    const matchNames = fuzzyMatched.map(p => p.name).join(', ');
    return {
      text: `¡Hola! Gracias por escribirnos 🤎 Quizás te referís a: ${matchNames}.\n\n${formatProductList(fuzzyMatched)}\n\nPodés ver el catálogo completo en ${CATALOG_URL}. 😊`,
      matchedProducts: fuzzyMatched,
      reason: `Posible coincidencia con: ${matchNames}`,
    };
  }

  // 6. Default fallback
  return {
    text: `¡Hola! Gracias por escribirnos 🤎 ¿En qué te podemos ayudar? Podés ver nuestro catálogo completo en ${CATALOG_URL}.\n\nPara pedidos necesitamos 48hs de anticipación. Retirás en Catamarca 1473, 1° B. 🧁`,
    matchedProducts: [],
    reason: 'Respuesta general',
  };
}
