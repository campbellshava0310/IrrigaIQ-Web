export interface AssistantStatus {
  configured: boolean;
  /** CLAUDE (Claude API) or OLLAMA (a local model on the server). */
  provider: 'CLAUDE' | 'OLLAMA';
  model: string;
  /** Where the model runs, for display: "Claude API" or "on this server". */
  hostedBy: string;
  /** Why the model cannot answer right now (e.g. not downloaded), or null when ready. */
  problem: string | null;
  suggestions: string[];
}

export type ToolState = 'running' | 'done' | 'error' | 'skipped';

export interface ToolActivity {
  id: string;
  name: string;
  label: string;
  state: ToolState;
}

export interface Source {
  title: string;
  publisher: string | null;
  url: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Assistant turns only. */
  status?: 'thinking' | 'streaming' | 'done' | 'error' | 'stopped';
  tools?: ToolActivity[];
  sources?: Source[];
  notice?: string;
  error?: string;
}

/** Server-sent events of one answer (see the backend's AssistantController). */
export type AssistantEvent =
  | { event: 'start'; data: { model: string } }
  | { event: 'status'; data: { state: 'thinking' } }
  | { event: 'text'; data: { delta: string } }
  | { event: 'tool'; data: ToolActivity }
  | { event: 'sources'; data: { sources: Source[] } }
  | { event: 'notice'; data: { message: string } }
  | { event: 'error'; data: { code: string; message: string } }
  | { event: 'done'; data: { stopReason: string; model: string; rounds: number } };
