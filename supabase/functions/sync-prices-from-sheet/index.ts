import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user exists
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get CSV URL
    const csvUrl = Deno.env.get('GOOGLE_SHEET_CSV_URL');
    if (!csvUrl) {
      return new Response(JSON.stringify({ error: 'GOOGLE_SHEET_CSV_URL not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch CSV
    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch CSV' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const csvText = await csvResponse.text();
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      return new Response(JSON.stringify({ updated: 0, skipped: 0, errors: ['CSV has no data rows'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse CSV (simple parser handling quoted fields)
    function parseCsvLine(line: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    }

    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
    const nameIdx = headers.indexOf('product_name');
    const priceIdx = headers.indexOf('price');
    const variantNameIdx = headers.indexOf('variant_name');
    const variantPriceIdx = headers.indexOf('variant_price');

    if (nameIdx === -1 || priceIdx === -1) {
      return new Response(JSON.stringify({ updated: 0, skipped: 0, errors: ['CSV missing required columns: product_name, price'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client for writes
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all products and variants
    const { data: products } = await admin.from('products').select('id, name');
    const { data: variants } = await admin.from('product_variants').select('id, product_id, label, price');

    if (!products) {
      return new Response(JSON.stringify({ updated: 0, skipped: 0, errors: ['Failed to fetch products'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const productMap = new Map(products.map(p => [p.name.toLowerCase().trim(), p]));
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const updatedProductIds = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = parseCsvLine(lines[i]);
        const productName = (cols[nameIdx] || '').trim();
        const priceStr = (cols[priceIdx] || '').trim();
        const variantName = variantNameIdx >= 0 ? (cols[variantNameIdx] || '').trim() : '';
        const variantPriceStr = variantPriceIdx >= 0 ? (cols[variantPriceIdx] || '').trim() : '';

        if (!productName) { skipped++; continue; }

        const product = productMap.get(productName.toLowerCase());
        if (!product) { skipped++; continue; }

        if (variantName && variantPriceStr) {
          const vPrice = parseFloat(variantPriceStr);
          if (isNaN(vPrice)) { errors.push(`Row ${i + 1}: invalid variant price "${variantPriceStr}"`); skipped++; continue; }

          const matchingVariant = variants?.find(
            v => v.product_id === product.id && v.label.toLowerCase().trim() === variantName.toLowerCase()
          );
          if (matchingVariant) {
            const { error } = await admin.from('product_variants').update({ price: vPrice }).eq('id', matchingVariant.id);
            if (error) { errors.push(`Row ${i + 1}: ${error.message}`); } else { updated++; updatedProductIds.add(product.id); }
          } else {
            errors.push(`Row ${i + 1}: variant "${variantName}" not found for "${productName}"`);
            skipped++;
          }
        } else {
          const price = parseFloat(priceStr);
          if (isNaN(price)) { errors.push(`Row ${i + 1}: invalid price "${priceStr}"`); skipped++; continue; }
          const { error } = await admin.from('products').update({ price }).eq('id', product.id);
          if (error) { errors.push(`Row ${i + 1}: ${error.message}`); } else { updated++; updatedProductIds.add(product.id); }
        }
      } catch (e) {
        errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }

    // Recalculate base price from variants and update last_price_sync for updated products
    for (const pid of updatedProductIds) {
      const productVariants = variants?.filter(v => v.product_id === pid);
      // Re-fetch variants for this product to get updated prices
      const { data: freshVariants } = await admin.from('product_variants').select('price').eq('product_id', pid);
      if (freshVariants && freshVariants.length > 0) {
        const minPrice = Math.min(...freshVariants.map(v => v.price));
        await admin.from('products').update({ price: minPrice, last_price_sync: new Date().toISOString() }).eq('id', pid);
      } else {
        await admin.from('products').update({ last_price_sync: new Date().toISOString() }).eq('id', pid);
      }
    }

    return new Response(JSON.stringify({ updated, skipped, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
