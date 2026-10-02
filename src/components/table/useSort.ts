import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

type SortValue = string | number | null | undefined;

/**
 * Client-side sorting for a table: returns the rows in order and the props each sortable header
 * needs. Empty values always sort last, whichever the direction.
 */
export function useSort<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => SortValue>,
  initial: SortState<K> | null = null,
) {
  const [sort, setSort] = useState<SortState<K> | null>(initial);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const read = accessors[sort.key];
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = read(a);
      const y = read(b);
      if (x == null || x === '') return y == null || y === '' ? 0 : 1;
      if (y == null || y === '') return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * factor;
      return String(x).localeCompare(String(y), undefined, { numeric: true }) * factor;
    });
    // accessors are defined inline by callers; the sort key is what changes the order
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  const header = (key: K) => ({
    direction: sort?.key === key ? sort.direction : null,
    onSort: () =>
      setSort((current) =>
        current?.key !== key
          ? { key, direction: 'asc' }
          : current.direction === 'asc'
            ? { key, direction: 'desc' }
            : null,
      ),
  });

  return { sorted, header };
}
