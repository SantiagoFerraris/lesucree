import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
        'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
        'Access-Control-Allow-Headers':
                  'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
        if (req.method === 'OPTIONS') {
                  return new Response(null, { headers: corsHeaders });
        }

             try {
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

          const userClient = createClient(supabaseUrl, supabaseAnonKey, {
                      global: { headers: { Authorization: authHeader } },
          });
                       const {
                                   data: { user },
                                   error: userError,
                       } = await userClient.auth.getUser();
                       if (userError || !user) {
                                   return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                                                 status: 401,
                                                 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                   });
                       }

          const csvUrl = Deno.env.get('GOOGLE_SHEET_CSV_URL');
                       if (!csvUrl) {
                                   return new Response(
                                                 JSON.stringify({ error: 'GOOGLE_SHEET_CSV_URL not configured' }),
                                         {
                                                         status: 500,
                                                         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                         }
                                               );
                       }

          const csvResponse = await fetch(csvUrl);
                       if (!csvResponse.ok) {
                                   return new Response(
                                                 JSON.stringify({ error: 'Failed to fetch CSV' }),
                                         {
                                                         status: 500,
                                                         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                         }
                                               );
                       }

          const csvText = await csvResponse.text();
                       const lines = csvText
                         .split('\n')
                         .map((l) => l.trim())
                         .filter((l) => l.length > 0);

          if (lines.length < 2) {
                      return new Response(
                                    JSON.stringify({ updated: 0, skipped: 0, errors: ['CSV has no data rows'] }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                                  );
          }

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

          const headers = parseCsvLine(lines[0]).map((h) =>
                      h.toLowerCase().replace(/\s+/g, '_')
                                                         );
                       const nameIdx = headers.indexOf('product_name');
                       const priceIdx = headers.indexOf('price');
                       const variantNameIdx = headers.indexOf('variant_name');
                       const variantPriceIdx = headers.indexOf('variant_price');

          if (nameIdx === -1 || priceIdx === -1) {
                      return new Response(
                                    JSON.stringify({
                                                    updated: 0,
                                                    skipped: 0,
                                                    errors: ['CSV missing required columns: product_name, price'],
                                    }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                                  );
          }

          const admin = createClient(supabaseUrl, supabaseServiceKey);

          const { data: products } = await admin.from('products').select('id, name');
                       const { data: variants } = await admin
                         .from('product_variants')
                         .select('id, product_id, label, price, sort_order')
                         .order('sort_order');

          if (!products) {
                      return new Response(
                                    JSON.stringify({
                                                    updated: 0,
                                                    skipped: 0,
                                                    errors: ['Failed to fetch products'],
                                    }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                                  );
          }

          const productMap = new Map(
                      products.map((p) => [p.name.toLowerCase().trim(), p])
                    );

          // Group CSV rows by product, preserving order
          interface SheetVariant {
                      variantName: string;
                      variantPrice: number;
                      basePrice: number;
                      rowNum: number;
          }

          const sheetProductRows = new Map<string, SheetVariant[]>();

          for (let i = 1; i < lines.length; i++) {
                      const cols = parseCsvLine(lines[i]);
                      const productName = (cols[nameIdx] || '').trim();
                      const priceStr = (cols[priceIdx] || '').trim();
                      const variantName =
                                    variantNameIdx >= 0 ? (cols[variantNameIdx] || '').trim() : '';
                      const variantPriceStr =
                                    variantPriceIdx >= 0 ? (cols[variantPriceIdx] || '').trim() : '';

                         if (!productName) continue;

                         const key = productName.toLowerCase();
                      if (!sheetProductRows.has(key)) {
                                    sheetProductRows.set(key, []);
                      }

                         sheetProductRows.get(key)!.push({
                                       variantName,
                                       variantPrice: parseFloat(variantPriceStr) || 0,
                                       basePrice: parseFloat(priceStr) || 0,
                                       rowNum: i + 1,
                         });
          }

          let updated = 0;
                       let skipped = 0;
                       const errors: string[] = [];
                       const updatedProductIds = new Set<string>();

          // Iterate grouped products instead of row-by-row
          for (const [productKey, sheetRows] of sheetProductRows) {
                      const product = productMap.get(productKey);
                      if (!product) {
                                    skipped += sheetRows.length;
                                    continue;
                      }

                         // DB variants for this product sorted by sort_order
                         const dbVariants = (variants || [])
                        .filter((v) => v.product_id === product.id)
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

                         const hasSheetVariants = sheetRows.some(
                                       (r) => r.variantName && r.variantPrice
                                     );

                         if (!hasSheetVariants) {
                                       // No variants in sheet -> update base price only
                        const basePrice = sheetRows[0]?.basePrice;
                                       if (basePrice && !isNaN(basePrice)) {
                                                       const { error } = await admin
                                                         .from('products')
                                                         .update({ price: basePrice })
                                                         .eq('id', product.id);
                                                       if (error) {
                                                                         errors.push(`${product.name}: ${error.message}`);
                                                       } else {
                                                                         updated++;
                                                                         updatedProductIds.add(product.id);
                                                       }
                                       }
                                       continue;
                         }

                         // Match variants by position (sort_order) and update label + price
                         const sheetVariants = sheetRows.filter(
                                       (r) => r.variantName && r.variantPrice
                                     );

                         if (dbVariants.length === 0) {
                                       // Product has no variants in DB -> update base price
                        const basePrice = sheetRows[0]?.basePrice;
                                       if (basePrice && !isNaN(basePrice)) {
                                                       const { error } = await admin
                                                         .from('products')
                                                         .update({ price: basePrice })
                                                         .eq('id', product.id);
                                                       if (error) {
                                                                         errors.push(`${product.name}: ${error.message}`);
                                                       } else {
                                                                         updated++;
                                                                         updatedProductIds.add(product.id);
                                                       }
                                       }
                                       continue;
                         }

                         // Update label + price by position
                         const count = Math.min(sheetVariants.length, dbVariants.length);
                      for (let i = 0; i < count; i++) {
                                    const sv = sheetVariants[i];
                                    const dbv = dbVariants[i];

                        const { error } = await admin
                                      .from('product_variants')
                                      .update({ label: sv.variantName, price: sv.variantPrice })
                                      .eq('id', dbv.id);

                        if (error) {
                                        errors.push(
                                                          `Row ${sv.rowNum} (${product.name}): ${error.message}`
                                                        );
                        } else {
                                        updated++;
                                        updatedProductIds.add(product.id);
                        }
                      }

                         if (sheetVariants.length > dbVariants.length) {
                                       errors.push(
                                                       `${product.name}: sheet has ${sheetVariants.length} variants but DB only has ${dbVariants.length}. Extra variants ignored.`
                                                     );
                         }
                      if (dbVariants.length > sheetVariants.length) {
                                    errors.push(
                                                    `${product.name}: DB has ${dbVariants.length} variants but sheet only has ${sheetVariants.length}. Extra DB variants untouched.`
                                                  );
                      }
          }

          // Recalculate base price from updated variants
          for (const pid of updatedProductIds) {
                      const { data: freshVariants } = await admin
                        .from('product_variants')
                        .select('price')
                        .eq('product_id', pid);

                         if (freshVariants && freshVariants.length > 0) {
                                       const minPrice = Math.min(...freshVariants.map((v) => v.price));
                                       await admin
                                         .from('products')
                                         .update({
                                                           price: minPrice,
                                                           last_price_sync: new Date().toISOString(),
                                         })
                                         .eq('id', pid);
                         } else {
                                       await admin
                                         .from('products')
                                         .update({ last_price_sync: new Date().toISOString() })
                                         .eq('id', pid);
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
