import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { GO_SHORTCUTS } from './palette';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/**
 * Global single-key shortcuts: "g" then a letter to jump between screens, "?" for the list.
 * They never fire while typing or while a dialog is open. (⌘K / Ctrl K and "/" belong to the palette.)
 */
export function useKeyboardShortcuts(onHelp: () => void) {
  const navigate = useNavigate();
  useEffect(() => {
    let pendingGo = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || document.querySelector('[role="dialog"]')) return;
      if (event.key === '?') {
        event.preventDefault();
        onHelp();
        return;
      }
      if (event.key === 'g') {
        pendingGo = Date.now();
        return;
      }
      if (Date.now() - pendingGo < 1200) {
        pendingGo = 0;
        const target = GO_SHORTCUTS.find((shortcut) => shortcut.key === event.key);
        if (target) {
          event.preventDefault();
          navigate(target.to);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, onHelp]);
}
