import { useCallback, useState } from 'react';

export interface SavedView<T> {
  id: string;
  name: string;
  filters: T;
}

const PREFIX = 'irrigaiq.views.';

function read<T>(key: string): SavedView<T>[] {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as SavedView<T>[]) : [];
  } catch {
    return []; // storage blocked or corrupt: views are a convenience only
  }
}

function write<T>(key: string, views: SavedView<T>[]) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(views));
  } catch {
    // a saved view that cannot persist still applies for this visit
  }
}

/** Filter combinations a user saved on this list, remembered in this browser. */
export function useSavedViews<T>(key: string) {
  const [views, setViews] = useState<SavedView<T>[]>(() => read<T>(key));
  const save = useCallback(
    (name: string, filters: T) =>
      setViews((current) => {
        const next = [
          ...current.filter((view) => view.name.toLowerCase() !== name.toLowerCase()),
          { id: `${Date.now()}`, name, filters },
        ];
        write(key, next);
        return next;
      }),
    [key],
  );
  const remove = useCallback(
    (id: string) =>
      setViews((current) => {
        const next = current.filter((view) => view.id !== id);
        write(key, next);
        return next;
      }),
    [key],
  );
  return { views, save, remove };
}

export function sameFilters<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
