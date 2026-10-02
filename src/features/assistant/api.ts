import { useQuery } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { farmOps } from '@/lib/api/farmScope';

import { createSseParser } from './sse';
import type { AssistantEvent, AssistantStatus } from './types';

export const assistantKeys = {
  status: (farmId: string) => [...farmOps(farmId), 'assistant'] as const,
};

export function useAssistantStatus(farmId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: assistantKeys.status(farmId ?? ''),
    queryFn: () => http.get<AssistantStatus>(`/farms/${farmId}/assistant`),
    enabled: Boolean(farmId) && enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Asks the assistant and streams its answer. The shared HTTP client keeps auth and token refresh;
 * the response is read incrementally from the XHR as server-sent events arrive. Resolves when the
 * answer is complete; rejects with ApiError when the request is refused before streaming.
 */
export async function streamChat(
  farmId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  onEvent: (event: AssistantEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  let seen = 0;
  const parser = createSseParser((message) => {
    try {
      onEvent({ event: message.event, data: JSON.parse(message.data) } as AssistantEvent);
    } catch {
      // An unparseable event is dropped rather than breaking the answer.
    }
  });
  const read = (text: string) => {
    if (text.length > seen) {
      parser.push(text.slice(seen));
      seen = text.length;
    }
  };
  const body = await http.post<unknown>(
    `/farms/${farmId}/assistant/chat`,
    { messages },
    {
      headers: { Accept: 'text/event-stream, application/json' },
      timeout: 0,
      signal,
      onDownloadProgress: (progress) => {
        const request = progress.event?.target as XMLHttpRequest | undefined;
        if (request && typeof request.responseText === 'string') read(request.responseText);
      },
    },
  );
  if (typeof body === 'string') read(body);
  parser.end();
}
