import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const BASE_URL = 'https://lesucreepasteleria.com.ar';
// Mirror public/sitemap.xml; static pages have no authoritative lastmod.
const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/catalogo', changefreq: 'daily', priority: '0.9' },
  { path: '/historia', changefreq: 'weekly', priority: '0.7' },
  { path: '/contacto', changefreq: 'weekly', priority: '0.7' },
  { path: '/politica-de-privacidad', changefreq: 'monthly', priority: '0.3' },
  { path: '/terminos-y-condiciones', changefreq: 'monthly', priority: '0.3' },
  { path: '/zumbita', changefreq: 'monthly', priority: '0.5' },
];

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&apos;';
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405, headers: { ...corsHeaders, Allow: 'GET, OPTIONS' },
    });
  }

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('Missing sitemap configuration');
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const now = new Date().toISOString();
    const entries = STATIC_PAGES.map(({ path, changefreq, priority }) =>
      `  <url><loc>${escapeXml(BASE_URL + path)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
    );

    // Read every eligible product rather than relying on the API's row cap.
    const chunkSize = 1000;
    for (let offset = 0; ; offset += chunkSize) {
      const { data, error } = await client.from('products')
        .select('id, slug, updated_at')
        .eq('active', true)
        .neq('status', 'oculto')
        .not('slug', 'is', null)
        .or(`visible_from.is.null,visible_from.lte.${now}`)
        .or(`visible_until.is.null,visible_until.gte.${now}`)
        .order('id', { ascending: true })
        .range(offset, offset + chunkSize - 1);
      if (error) throw error;
      for (const product of data ?? []) {
        if (!product.slug) continue;
        const location = `${BASE_URL}/catalogo/${encodeURIComponent(product.slug)}`;
        const lastmod = product.updated_at
          ? `<lastmod>${escapeXml(product.updated_at)}</lastmod>` : '';
        entries.push(`  <url><loc>${escapeXml(location)}</loc>${lastmod}</url>`);
      }
      if (!data || data.length < chunkSize) break;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Sitemap generation failed:', error instanceof Error ? error.message : 'Unknown error');
    return new Response('No se pudo generar el sitemap.', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
});