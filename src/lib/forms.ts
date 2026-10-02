import type { UseFormReturnType } from '@mantine/form';

import { toApiError } from '@/lib/api/errors';
import { notifyError } from '@/lib/notify';

/**
 * Shows server-side validation errors on the matching inputs; anything that is not a field error
 * becomes a notification. Returns the parsed error for callers that branch on its code.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyServerErrors(form: UseFormReturnType<any>, error: unknown, title?: string) {
  const apiError = toApiError(error);
  if (Object.keys(apiError.fieldErrors).length > 0) {
    form.setErrors(apiError.fieldErrors);
  } else {
    notifyError(apiError, title);
  }
  return apiError;
}

/** Mantine NumberInput yields '' when cleared; the API expects null. */
export function optionalNumber(value: number | string | null | undefined): number | null {
  if (value === '' || value == null) {
    return null;
  }
  return typeof value === 'number' ? value : Number(value);
}

export function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Mantine date pickers work in local "YYYY-MM-DD HH:mm:ss" strings; the API takes instants. */
export function localToInstant(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** An instant as the local "YYYY-MM-DD HH:mm:ss" string Mantine date pickers expect. */
export function instantToLocal(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:00`;
}
