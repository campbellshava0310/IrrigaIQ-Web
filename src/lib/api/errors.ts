import { isAxiosError } from 'axios';

/** RFC 9457 problem body as produced by the IrrigaIQ API. */
export interface ProblemBody {
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  requestId?: string;
  errors?: { field: string; message: string }[];
  [key: string]: unknown;
}

interface ApiErrorInit {
  status: number;
  code: string;
  message: string;
  requestId?: string;
  fieldErrors?: Record<string, string>;
  body?: ProblemBody;
}

/**
 * Every failed API call surfaces as an ApiError. Branch on `code` (stable, from the API), show
 * `message` to users, and quote `requestId` in support requests.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly fieldErrors: Record<string, string>;
  readonly body?: ProblemBody;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId;
    this.fieldErrors = init.fieldErrors ?? {};
    this.body = init.body;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (isAxiosError(error)) {
    if (!error.response) {
      return new ApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: "Can't reach the IrrigaIQ server. Check your connection and try again.",
      });
    }
    const body = isProblem(error.response.data) ? error.response.data : undefined;
    const fieldErrors = Object.fromEntries(
      (body?.errors ?? []).map((violation) => [violation.field, violation.message]),
    );
    return new ApiError({
      status: error.response.status,
      code: body?.code ?? `HTTP_${error.response.status}`,
      message: body?.detail ?? body?.title ?? 'Something went wrong. Please try again.',
      requestId: body?.requestId ?? error.response.headers['x-request-id'],
      fieldErrors,
      body,
    });
  }
  return new ApiError({
    status: 0,
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
  });
}

function isProblem(data: unknown): data is ProblemBody {
  return typeof data === 'object' && data !== null && ('code' in data || 'detail' in data);
}
