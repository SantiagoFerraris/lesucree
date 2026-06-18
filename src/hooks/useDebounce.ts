import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * have passed without a new change. The input stays controlled by the
 * caller; only downstream consumers (queries, filtering) see the delayed
 * value. Pending timers are cleared on unmount or when value/delay change.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
