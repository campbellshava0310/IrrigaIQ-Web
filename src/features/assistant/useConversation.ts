import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/errors';

import { streamChat } from './api';
import type { AssistantEvent, ChatMessage, ToolActivity } from './types';

let nextId = 0;
const id = () => `m${++nextId}`;

/** The conversation lives in the browser; each question sends the history so far. */
function history(messages: ChatMessage[], question: string) {
  return [
    ...messages
      .filter((m) => m.role === 'user' || (m.content.trim() && m.status !== 'error'))
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: question },
  ];
}

function apply(message: ChatMessage, event: AssistantEvent): ChatMessage {
  switch (event.event) {
    case 'status':
      return message.content ? message : { ...message, status: 'thinking' };
    case 'text':
      return { ...message, content: message.content + event.data.delta, status: 'streaming' };
    case 'tool': {
      const tools = message.tools ?? [];
      const known = tools.some((tool) => tool.id === event.data.id);
      const next: ToolActivity[] = known
        ? tools.map((tool) => (tool.id === event.data.id ? event.data : tool))
        : [...tools, event.data];
      return { ...message, tools: next };
    }
    case 'sources':
      return { ...message, sources: event.data.sources };
    case 'notice':
      return { ...message, notice: event.data.message };
    case 'error':
      return { ...message, status: 'error', error: event.data.message };
    case 'done':
      return message.status === 'error' ? message : { ...message, status: 'done' };
    default:
      return message;
  }
}

export function useConversation(farmId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const controller = useRef<AbortController | null>(null);
  const last = messages[messages.length - 1];
  const busy =
    last?.role === 'assistant' && (last.status === 'thinking' || last.status === 'streaming');

  const update = useCallback((messageId: string, change: (message: ChatMessage) => ChatMessage) => {
    setMessages((current) => current.map((m) => (m.id === messageId ? change(m) : m)));
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setMessages([]);
  }, []);

  // A different farm is a different conversation.
  useEffect(() => reset, [farmId, reset]);

  const send = useCallback(
    (question: string, previous: ChatMessage[] = messages) => {
      const text = question.trim();
      if (!farmId || !text) return;
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      const reply: ChatMessage = {
        id: id(),
        role: 'assistant',
        content: '',
        status: 'thinking',
        tools: [],
      };
      setMessages([...previous, { id: id(), role: 'user', content: text }, reply]);

      streamChat(
        farmId,
        history(previous, text),
        (event) => update(reply.id, (m) => apply(m, event)),
        abort.signal,
      )
        .then(() =>
          update(reply.id, (m) =>
            m.status === 'thinking' || m.status === 'streaming' ? { ...m, status: 'done' } : m,
          ),
        )
        .catch((error: unknown) => {
          if (abort.signal.aborted) {
            update(reply.id, (m) => ({ ...m, status: 'stopped' }));
            return;
          }
          const message =
            error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
          update(reply.id, (m) => ({ ...m, status: 'error', error: message }));
        });
    },
    [farmId, messages, update],
  );

  const stop = useCallback(() => controller.current?.abort(), []);

  /** Asks the last question again, dropping the failed answer. */
  const retry = useCallback(() => {
    const index = messages.findLastIndex((m) => m.role === 'user');
    const question = messages[index];
    if (question) send(question.content, messages.slice(0, index));
  }, [messages, send]);

  return { messages, busy, send, stop, retry, reset };
}
