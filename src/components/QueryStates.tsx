import {
  Button,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  VisuallyHidden,
} from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { toApiError } from '@/lib/api/errors';

interface LoadingStateProps {
  /** Announced to screen readers and shown under the placeholder. */
  label?: string;
  /** `page` sketches a whole screen (metrics and a panel); `inline` a few rows inside a card. */
  layout?: 'page' | 'inline';
}

/** Skeletons in the shape of the content, so the screen does not jump when data arrives. */
export function LoadingState({ label = 'Loading…', layout = 'inline' }: LoadingStateProps) {
  return (
    <Stack gap="md" role="status" aria-live="polite">
      <VisuallyHidden>{label}</VisuallyHidden>
      {layout === 'page' ? (
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} h={112} radius="md" />
            ))}
          </SimpleGrid>
          <Skeleton h={280} radius="md" />
          <Text size="sm" c="dimmed" ta="center" aria-hidden>
            {label}
          </Text>
        </>
      ) : (
        <Stack gap={10} py={4}>
          <Skeleton h={14} w="38%" radius="sm" />
          <Skeleton h={40} radius="sm" />
          <Skeleton h={40} radius="sm" />
          <Skeleton h={40} w="82%" radius="sm" />
        </Stack>
      )}
    </Stack>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = toApiError(error);
  return (
    <Paper withBorder p="lg" role="alert">
      <Group align="flex-start" wrap="nowrap" gap="md">
        <ThemeIcon size={36} radius="md" variant="light" color="red">
          <IconAlertTriangle size={20} />
        </ThemeIcon>
        <Stack gap={6} style={{ flex: 1 }} miw={0}>
          <Text fw={600}>Couldn't load this</Text>
          <Text size="sm" c="dimmed">
            {apiError.message}
          </Text>
          {apiError.requestId && (
            <Text size="xs" c="dimmed" ff="monospace">
              Reference {apiError.requestId}
            </Text>
          )}
          {onRetry && (
            <Group mt={6}>
              <Button
                size="xs"
                variant="default"
                leftSection={<IconRefresh size={14} />}
                onClick={onRetry}
              >
                Try again
              </Button>
            </Group>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Colour of the icon badge; success states ("all clear") use teal. */
  color?: string;
  /** Drop the card chrome when the empty state already sits inside a card. */
  bare?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  color = 'brand',
  bare = false,
}: EmptyStateProps) {
  const content = (
    <Stack align="center" gap={6} py={bare ? 'md' : 'xl'} px="md">
      <ThemeIcon size={48} radius="xl" variant="light" color={color} mb={8}>
        {icon}
      </ThemeIcon>
      <Text fw={600} fz="md" ta="center">
        {title}
      </Text>
      {description && (
        <Text c="dimmed" size="sm" ta="center" maw={440}>
          {description}
        </Text>
      )}
      {action && <Group mt="sm">{action}</Group>}
    </Stack>
  );
  if (bare) {
    return content;
  }
  return <Paper withBorder>{content}</Paper>;
}
