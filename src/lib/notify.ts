import { notifications } from '@mantine/notifications';

import { toApiError } from '@/lib/api/errors';

export function notifySuccess(message: string, title?: string) {
  notifications.show({ color: 'teal', title, message });
}

export function notifyError(error: unknown, title = 'Something went wrong') {
  const apiError = toApiError(error);
  notifications.show({
    color: 'red',
    title,
    message: apiError.requestId
      ? `${apiError.message} (ref ${apiError.requestId.slice(0, 8)})`
      : apiError.message,
  });
}
