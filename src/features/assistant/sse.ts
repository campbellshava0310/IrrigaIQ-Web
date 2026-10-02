export interface SseMessage {
  event: string;
  data: string;
}

/**
 * Incremental parser for a text/event-stream body. Feed it chunks as they arrive, in any split;
 * each complete event (terminated by a blank line) is emitted once.
 */
export function createSseParser(onMessage: (message: SseMessage) => void) {
  let buffer = '';

  const dispatch = (block: string) => {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line === '' || line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    if (data.length > 0) onMessage({ event, data: data.join('\n') });
  };

  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n?/g, '\n');
      let end = buffer.indexOf('\n\n');
      while (end !== -1) {
        dispatch(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        end = buffer.indexOf('\n\n');
      }
    },
    /** Flushes a final event the server did not terminate with a blank line. */
    end() {
      if (buffer.trim()) dispatch(buffer);
      buffer = '';
    },
  };
}
