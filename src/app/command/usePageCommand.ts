import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

import type { PageCommand } from './palette';

/**
 * The command a page was opened with (`?do=log-irrigation`), and a way to clear it once handled.
 * Dialogs derive their open state from it, so commands also work as deep links.
 */
export function usePageCommand(): [PageCommand | null, () => void] {
  const [params, setParams] = useSearchParams();
  const command = params.get('do') as PageCommand | null;
  const clear = useCallback(
    () =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('do');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [command, clear];
}
