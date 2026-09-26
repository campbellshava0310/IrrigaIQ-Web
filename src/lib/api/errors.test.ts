import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { ApiError, toApiError } from './errors';

const response = (status: number, data: unknown, headers: Record<string, string> = {}) =>
  ({
    status,
    data,
    headers,
    statusText: '',
    config: { headers: new AxiosHeaders() },
  }) as AxiosResponse;

describe('toApiError', () => {
  it('maps problem details, including field errors', () => {
    const error = toApiError(
      new AxiosError(
        'Bad Request',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        response(400, {
          status: 400,
          code: 'VALIDATION_FAILED',
          detail: 'The request contains invalid fields',
          requestId: 'req-123',
          errors: [{ field: 'email', message: 'must be a well-formed email address' }],
        }),
      ),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.requestId).toBe('req-123');
    expect(error.fieldErrors).toEqual({ email: 'must be a well-formed email address' });
  });

  it('treats a missing response as a network error', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(error.isNetworkError).toBe(true);
    expect(error.code).toBe('NETWORK_ERROR');
  });

  it('falls back to the status code for non-problem bodies', () => {
    const error = toApiError(
      new AxiosError(
        'Bad Gateway',
        'ERR_BAD_RESPONSE',
        undefined,
        undefined,
        response(502, '<html>bad gateway</html>', { 'x-request-id': 'edge-1' }),
      ),
    );
    expect(error.code).toBe('HTTP_502');
    expect(error.requestId).toBe('edge-1');
  });
});
