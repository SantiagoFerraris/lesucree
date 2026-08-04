// Shared CORS allow-list for all edge functions.
// Production domain + Lovable preview/staging + local dev are allowed.
// Anything else gets the production origin (i.e. the browser blocks it).

const PRODUCTION_ORIGIN = 'https://lesucreepasteleria.com.ar';

const STATIC_ALLOWED = new Set<string>([
  PRODUCTION_ORIGIN,
  'https://www.lesucreepasteleria.com.ar',
  'https://lesucree.lovable.app',
  'https://lesucree.vercel.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
]);

// Lovable preview/sandbox hosts are dynamic, so match them by pattern.
const ALLOWED_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+\.sandbox\.lovable\.dev$/i,
];

// Extra origins can be added at runtime via the ALLOWED_ORIGIN secret
// (comma-separated) without a redeploy of this file's logic.
function extraOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGIN') || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (STATIC_ALLOWED.has(origin)) return true;
  if (extraOrigins().includes(origin)) return true;
  return ALLOWED_PATTERNS.some((re) => re.test(origin));
}

export function corsFor(req?: Request | null): Record<string, string> {
  const origin = req?.headers.get('Origin') ?? null;
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? (origin as string) : PRODUCTION_ORIGIN,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
