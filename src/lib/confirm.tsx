import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import type { ReactNode } from 'react';

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
}

/** Confirmation for destructive actions. */
export function confirmDestructive({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
}: ConfirmOptions) {
  modals.openConfirmModal({
    title,
    centered: true,
    children: <Text size="sm">{message}</Text>,
    labels: { confirm: confirmLabel, cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm,
  });
}
