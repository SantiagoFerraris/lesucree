const CHUNK = 1000;

/**
 * Fetches every row of a query by paging with .range() in 1000-row chunks.
 * `build` must return a fresh query builder each call (filters/order included).
 */
export async function fetchAll<T = any>(build: () => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await build().range(from, from + CHUNK - 1);
    if (error) throw error;
    const batch = (data || []) as T[];
    rows.push(...batch);
    if (batch.length < CHUNK) break;
  }
  return rows;
}
