import { useEffect, useSyncExternalStore } from 'react';

interface AssistantState {
  opened: boolean;
  /** A question to ask as soon as the panel is ready (from "Ask about this" buttons). */
  request: { prompt: string; id: number } | null;
}

let state: AssistantState = { opened: false, request: null };
const listeners = new Set<() => void>();
let requestId = 0;

function set(next: Partial<AssistantState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

/** Open the assistant from anywhere, optionally asking a question straight away. */
export const assistant = {
  open: (prompt?: string) =>
    set({ opened: true, request: prompt ? { prompt, id: ++requestId } : state.request }),
  close: () => set({ opened: false }),
  toggle: () => set({ opened: !state.opened }),
  /** Takes the pending question, so it is asked exactly once. */
  takeRequest: () => {
    const request = state.request;
    if (request) set({ request: null });
    return request;
  },
};

export function useAssistantState(): AssistantState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** ⌘J / Ctrl J opens and closes the assistant from anywhere. */
export function useAssistantShortcut() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        assistant.toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
