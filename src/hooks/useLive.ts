import { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import type { DependencyList } from 'react';

/**
 * Subscribe to a Dexie query; re-renders whenever the underlying data changes.
 * Returns `initial` until the first result arrives.
 */
export function useLive<T>(query: () => T | Promise<T>, deps: DependencyList, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    const sub = liveQuery(() => queryRef.current()).subscribe({
      next: (v) => setValue(v),
      error: (e) => console.error('Live query failed', e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
