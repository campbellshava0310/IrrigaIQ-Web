import { describe, expect, it } from 'vitest';

import { createSseParser, type SseMessage } from './sse';

function parse(chunks: string[]): SseMessage[] {
  const out: SseMessage[] = [];
  const parser = createSseParser((message) => out.push(message));
  chunks.forEach((chunk) => parser.push(chunk));
  parser.end();
  return out;
}

describe('createSseParser', () => {
  it('parses named events with JSON data', () => {
    expect(parse(['event:text\ndata:{"delta":"Hi"}\n\n'])).toEqual([
      { event: 'text', data: '{"delta":"Hi"}' },
    ]);
  });

  it('handles events split across chunks at any point', () => {
    const stream = 'event:tool\ndata:{"id":"t1"}\n\nevent:text\ndata:{"delta":"a b"}\n\n';
    for (let cut = 1; cut < stream.length; cut++) {
      expect(parse([stream.slice(0, cut), stream.slice(cut)])).toEqual([
        { event: 'tool', data: '{"id":"t1"}' },
        { event: 'text', data: '{"delta":"a b"}' },
      ]);
    }
  });

  it('accepts CRLF, comments, a space after the colon and multi-line data', () => {
    expect(parse([': keep-alive\r\nevent: done\r\ndata: line 1\r\ndata: line 2\r\n\r\n'])).toEqual([
      { event: 'done', data: 'line 1\nline 2' },
    ]);
  });

  it('flushes an unterminated final event', () => {
    expect(parse(['event:done\ndata:{}'])).toEqual([{ event: 'done', data: '{}' }]);
  });
});
